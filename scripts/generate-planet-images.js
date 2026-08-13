const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const OUTPUT_DIR = path.join(__dirname, '..', 'images', 'planets');
const AMOUNT = Number.parseInt(process.argv[2], 10) || 500;

const getPlanetsDefinition = () => {
    const definitionPath = path.join(__dirname, '..', 'node_modules', '@dicebear', 'styles', 'planets.json');
    const altPath = path.join(__dirname, '..', 'node_modules', '@dicebear', 'styles', 'dist', 'planets.min.json');

    if (fs.existsSync(definitionPath)) {
        return JSON.parse(fs.readFileSync(definitionPath, 'utf-8'));
    }
    if (fs.existsSync(altPath)) {
        return JSON.parse(fs.readFileSync(altPath, 'utf-8'));
    }
    throw new Error('Não foi possível encontrar planets.json em @dicebear/styles. Rode "npm install" primeiro.');
};

async function main() {
    const { Avatar, Style } = await import('@dicebear/core');
    const { Resvg } = require('@resvg/resvg-js');

    const definition = getPlanetsDefinition();
    const style = new Style(definition);

    fs.mkdirSync(OUTPUT_DIR, { recursive: true });

    const existing = fs.readdirSync(OUTPUT_DIR).filter((f) => f.endsWith('.png'));
    if (existing.length) {
        console.log(`Aviso: ${OUTPUT_DIR} já tem ${existing.length} imagem(ns). Elas serão mantidas e novas serão adicionadas até chegar em ${AMOUNT}.`);
    }

    const startIndex = existing.length;
    const target = Math.max(AMOUNT, existing.length);

    console.log(`Gerando imagens de planeta ${startIndex + 1} até ${target}...`);

    for (let i = startIndex; i < target; i++) {
        // Seed aleatória só para dar variedade visual ao pool; não tem relação
        // com o seed do planeta no jogo (a escolha da imagem, em tempo de
        // execução, é feita por hash do seed do planeta contra o tamanho do pool).
        const seed = crypto.randomBytes(8).toString('hex');

        const avatar = new Avatar(style, {
            borderRadius: 10,
            shadeVariant: { hard: 1, soft: 1 },
            starProbability: 80,
            starVariant: { faint: 2, large: 1, medium: 1, small: 1, sparkle: 1 },
            surfaceVariant: {
                banded: 1, belted: 2, cap: 2, cracked: 2, cratered: 2,
                marbled: 2, speckled: 2, spotted: 1, swirl: 2, terra: 2,
            },
            backgroundColor: [
                '17233f', '23244a', '2c1c45', '0f2336', '012e3a', '002a2e',
                '0b3533', '361b34', '1c1f27', '1d1a2a', '2e1b20', '242424',
            ],
            backgroundColorFill: ['linear'],
            backgroundColorAngle: 295,
            backgroundColorFillStops: 3,
            seed,
        });

        const svg = avatar.toString();
        const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: 320 } });
        const pngBuffer = resvg.render().asPng();

        const filename = `planet_${String(i + 1).padStart(4, '0')}.png`;
        fs.writeFileSync(path.join(OUTPUT_DIR, filename), pngBuffer);

        if ((i + 1) % 50 === 0 || i + 1 === target) {
            console.log(`  ${i + 1}/${target} geradas...`);
        }
    }

    console.log(`Pronto! ${target} imagens salvas em ${OUTPUT_DIR}`);
    console.log('O bot agora vai ler essas imagens direto do disco, sem gerar nada em tempo real.');
}

main().catch((err) => {
    console.error('Falha ao gerar imagens de planeta:', err);
    process.exit(1);
});
