# Balanceamento da economia — proposta completa

> **Aplicado no código** (preços, drops, receitas, custo em ∩oins dos
> upgrades, taxa do `/gift` e consumíveis). Este documento explica o
> porquê de cada número. Todos os números abaixo saíram de
> um simulador de jogador (Monte Carlo, 20–30 jogadores simulados por cenário)
> usando as regras reais do bot: tabelas de drop, passes de sorteio de
> `planetResources.js`, distâncias, velocidades, tempo de mineração e o limite
> de 10 visualizações por hora.

---

## 1. Diagnóstico — o que está errado hoje

### 1.1 Recurso comum vira lixo (e lixo vira inflação)

Produção x demanda de um jogador que maximiza a nave (mediana de 20 jogadores
simulados):

| Recurso | Usado em receitas (total) | Produzido até maximizar | Sobra vendida pra loja |
|---|---:|---:|---:|
| Pedra | 60 | 406 | 346 |
| Madeira | 30 | 208 | 178 |
| Terra | 45 | 186 | 141 |
| Ferro | 28 | 226 | 198 |
| Metal | 48 | 310 | 262 |
| Cobre | 63 | 134 | 72 |
| Minério Luminoso | 21 | 25 | 4 |
| Pérola Cósmica | 8 | 10 | 2 |
| Essência Estelar | 6 | 8 | 2 |

Os comuns são produzidos **6–7x** acima do que qualquer receita consome. A sobra
só tem um destino: `sell_shop`, que **cria ∩oins do nada**. Os gargalos reais
são Minério Luminoso, Pérola Cósmica e Essência Estelar.

### 1.2 Nenhum sumidouro recorrente

Depois dos 12 upgrades não existe nada em que gastar. Um jogador com a nave
máxima gera **~8.400 ∩/h** vendendo tudo, para sempre. O ranking "Mais Ricos"
vira só "quem jogou mais horas".

Hoje as ∩oins só saem da economia por: compras na Loja do Sistema, chapéus da
loja e a taxa de 5% do mercado entre jogadores.

### 1.3 Preços desalinhados do custo real

"Custo real" = minutos de jogo para conseguir 1 unidade mirando o melhor
planeta, com nave de meio de jogo (C/C/C). Na média do jogo, **1 minuto de
farm ≈ 50 ∩** de preço de loja. Quem foge disso:

| Recurso | Min/unidade | Preço loja atual | ∩ por minuto | Situação |
|---|---:|---:|---:|---|
| Terra | 1,1 | 30 | 27 | barato demais |
| Metal | 5,8 | 150 | 26 | raridade C, mas pedido em massa no início |
| Cristal Azul | 10,7 | 400 | 38 | barato |
| Cristal Roxo | 31,2 | 1.000 | 32 | barato |
| Essência Estelar | 123 | 10.000 | 81 | **caro demais** |

### 1.4 Preço de venda sem regra

A relação venda/compra varia de **27%** (Pedra) a **12,5%** (Essência). Não há
motivo de design para isso.

### 1.5 Receitas que pulam de tier

- `excavation_3` (tier C) pede Minério Luminoso (D).
- `scanner_3` (tier C) pede Cristal Roxo (D).

Isso obriga quem está no começo a caçar planetas épicos para um upgrade
intermediário.

---

## 2. Princípios da proposta

1. **Preço de loja ≈ 50 ∩ por minuto de farm** (nave C/C/C, arredondado).
2. **Preço de venda = 25% do preço de loja**, para todo recurso.
   - Fica abaixo do piso do mercado entre jogadores (50%), então vender para
     outro jogador sempre rende pelo menos o dobro de vender para o sistema.
   - Continua impossível comprar da loja e revender com lucro.
3. **Nenhuma receita pede recurso de raridade acima do nível que desbloqueia**:
   - Nível 2 = até B
   - Nível 3 = até C
   - Nível 4 = até D
   - Nível 5 = até E

   O núcleo de cada receita é o tier atual e o anterior; recursos comuns
   entram como volume (é o que dá destino à sobra deles).
4. **Upgrades custam ∩oins** (sumidouro de uma vez só).
5. **Consumíveis** (sumidouro recorrente) que transformam a sobra de comuns em
   algo útil.
6. **Não mexer** no que já está equilibrado: chances de raridade de planeta,
   distâncias, velocidades, tempo de mineração, bônus da sonda, moedas de missão
   e daily.

---

## 3. Recursos — nova tabela

`gameConfig/resources.js`

| Recurso | Raridade | Loja (atual → novo) | Venda (atual → novo) |
|---|---|---:|---:|
| Pedra | A | 50 → **50** | 12 → **13** |
| Madeira | A | 50 → **50** | 12 → **13** |
| Terra | A | 30 → **50** | 8 → **13** |
| Ferro | B | 100 → **100** | 25 → **25** |
| Cobre | B | 100 → **100** | 25 → **25** |
| Metal | C → **B** | 150 → **150** | 35 → **38** |
| Cristal Azul | C | 400 → **500** | 100 → **125** |
| Fragmento Estelar | C | 600 → **550** | 150 → **138** |
| Cristal Roxo | D | 1.000 → **1.500** | 250 → **375** |
| Minério Luminoso | D | 1.500 → **1.600** | 300 → **400** |
| Núcleo de Planeta | E | 3.000 → **3.000** | 600 → **750** |
| Pérola Cósmica | E | 5.000 → **4.500** | 850 → **1.125** |
| Essência Estelar | E | 10.000 → **6.000** | 1.250 → **1.500** |

**Por que Metal vira raridade B?**
- Ele é pedido em quase todo upgrade inicial, mas hoje cai com quantidade de
  raridade C (2–5 por planeta). Isso dava ~6 min por unidade logo no começo do
  jogo.
- Como B, ele cai com 5–14 por planeta, coerente com o preço de 150 que já
  tinha.
- Efeito colateral: o emoji de raridade dele no inventário muda para incomum.

**Por que a Essência fica mais barata na loja?**
- Ela custa ~123 min de farm, o que pelo princípio dá ~6.000.
- A 10.000, comprar da loja era inviável. A 6.000, quem está atrasado consegue
  completar o último upgrade gastando ∩oins, e essas ∩oins são destruídas.
- No mercado entre jogadores o piso vai para 3.000.

---

## 4. Drop dos planetas

`gameConfig/planetDropTables.js` — **uma única mudança**, no planeta incomum:

| Planeta B | Atual | Novo |
|---|---|---|
| Ferro | 35 | 35 |
| Cobre | 30 | 30 |
| Pedra | 20 | **Metal 20** |
| Madeira | 15 | **Pedra 15** |

Planeta incomum passa a ser "o planeta dos metais". Madeira já sobra muito nos
planetas comuns. O resto das tabelas fica igual.

Quantidades por raridade (`rarities.js`) **não mudam**.

---

## 5. Receitas de craft

`utils/craftRecipes.js` — cada trilha tem uma "identidade":

- **Propulsor** (metais e energia): Ferro, Metal, Fragmento Estelar, Minério
  Luminoso, Essência Estelar.
- **Sonda de Escavação** (geologia): Pedra, Madeira, Cobre, Cristal Azul,
  Cristal Roxo, Núcleo de Planeta, Pérola Cósmica.
- **Scanner** (dados e óptica): Terra, Madeira, Ferro, Cristais, Fragmento,
  Minério, Pérola.

O "valor loja" de cada receita é a soma dos ingredientes a preço de loja.
Dividido por 50, dá aproximadamente os minutos de farm.

### Propulsor

| Nível | Ingredientes | ∩oins | Valor loja |
|---|---|---:|---:|
| B | 10 Ferro · 6 Metal · 12 Pedra | 300 | 2.500 (~50 min) |
| C | 15 Metal · 10 Ferro · 6 Fragmento Estelar | 2.000 | 6.550 (~2h10) |
| D | 25 Metal · 12 Fragmento Estelar · 6 Minério Luminoso | 6.000 | 19.950 (~6h40) |
| E | 10 Minério Luminoso · 3 Núcleo de Planeta · 4 Essência Estelar | 15.000 | 49.000 (~16h) |

### Sonda de Escavação

| Nível | Ingredientes | ∩oins | Valor loja |
|---|---|---:|---:|
| 2 | 15 Pedra · 10 Madeira · 6 Cobre | 300 | 1.850 (~37 min) |
| 3 | 25 Pedra · 15 Cobre · 6 Cristal Azul | 2.000 | 5.750 (~1h55) |
| 4 | 30 Cobre · 12 Cristal Azul · 6 Cristal Roxo | 6.000 | 18.000 (~6h) |
| 5 | 10 Cristal Roxo · 4 Núcleo de Planeta · 3 Pérola Cósmica | 15.000 | 40.500 (~13h30) |

### Scanner Estelar

| Nível | Ingredientes | ∩oins | Valor loja |
|---|---|---:|---:|
| 2 | 15 Terra · 10 Madeira · 5 Ferro | 300 | 1.750 (~35 min) |
| 3 | 25 Terra · 10 Cobre · 4 Cristal Azul · 4 Fragmento Estelar | 2.000 | 6.450 (~2h10) |
| 4 | 10 Fragmento Estelar · 5 Cristal Roxo · 5 Minério Luminoso | 6.000 | 21.000 (~7h) |
| 5 | 8 Cristal Roxo · 3 Núcleo de Planeta · 5 Pérola Cósmica · 2 Essência Estelar | 15.000 | 55.500 (~18h30) |

**Totais:**
- 228.800 ∩ em valor de loja.
- **69.900 ∩ em taxas de craft, destruídas** (hoje: 0).
- O custo em ∩oins é o campo `coinsCost` de cada receita: `startCraftJob`
  confere o saldo e debita na mesma transação dos recursos, e a tela do
  `/craft` mostra a linha de ∩oins com o check de "tem / não tem".

---

## 6. Resultado da simulação

Jogador "eficiente": mira sempre o upgrade mais barato, joga ~2h/dia (1 daily a
cada 2h ativas) e vende o que não precisa. Tempos em **horas de jogo ativo**.

| Marco | Atual | Proposta |
|---|---:|---:|
| Primeiro upgrade | 1,5h | **1,2h** |
| Todos os nível 2 | 3,3h | **1,4h** |
| Todos os nível 3 | 7,8h | **4,6h** |
| Todos os nível 4 | 14,4h | **10,7h** |
| Nave máxima (mediana) | 24,5h | **26,6h** |
| Nave máxima (10% mais rápidos / 10% mais lentos) | 19,5h / 32,4h | 19,3h / 38,3h |
| ∩ destruídas em craft | 0 | **69.900** |
| Saldo ao maximizar | 84.796 | **27.392** |

**Leitura:**
- **Começo mais rápido.** Os três nível 2 saem na primeira sessão.
- **Meio de jogo mais suave.** Acabou o pulo de tier.
- **Fim de jogo com o mesmo tempo total.** As ∩oins acumuladas caem ~68%,
  porque agora têm destino.
- **Jogadores reais são mais lentos** que o simulado: não miram perfeitamente,
  esquecem missões. Espere algo como **1,5–2x** esses tempos (≈ 40–50h reais,
  ou 3–4 semanas a 2h/dia).
- **Para alongar o fim de jogo**, aumente só as quantidades dos níveis 4 e 5.
  +20% nelas dá **≈ +4h** na mediana sem mexer no começo.

---

## 7. Consumíveis — o sumidouro recorrente (feature nova)

Itens craftáveis, gastos na **próxima missão**. Eles transformam a sobra de
comuns (vendida a 13–25 ∩) em vantagem real e queimam ∩oins.

| Item | Receita | ∩oins | Efeito |
|---|---|---:|---|
| **Kit de Mineração** | 15 Pedra · 10 Terra · 5 Cobre | 200 | +25% recursos na próxima missão |
| **Célula de Combustível** | 10 Madeira · 10 Terra · 4 Ferro | 150 | −40% no tempo de viagem (ida e volta) da próxima missão |

### Matemática do Kit

Custo efetivo de um Kit para quem tem nave máxima:
- Ingredientes que seriam vendidos: 15×13 + 10×13 + 5×25 = **450 ∩**
- Taxa: **200 ∩**
- **Total ≈ 650 ∩**

| Planeta | Venda base dos recursos por missão | +25% | Vale usar? |
|---|---:|---:|---|
| Raro (C) | 1.296 | +324 | não |
| Épico (D) | 2.550 | +637 | empate |
| Lendário (E) | 4.603 | +1.151 | **sim** (+500 de lucro) |

Isso cria uma decisão de verdade: "guardo o Kit para o lendário".

### Matemática da Célula de Combustível

É forte no meio de jogo e fraca no fim:
- Planeta lendário com Propulsor C: ~21 min de viagem → economiza ~8,5 min.
- Com Propulsor E: economiza ~2,5 min.

Isso é bom, porque cria demanda de Madeira e Terra justamente quando o jogador
ainda está progredindo.

### Impacto estimado no fim de jogo

- Fim de jogo ≈ 4 missões por hora, Kit nas épicas e lendárias.
- Isso remove ≈ 4 × (200 + 450) ≈ **2.600 ∩/h** de criação de ∩oins.
- São ~30% dos ~8.700 ∩/h que um jogador máximo gera.
- Somado às taxas do mercado, a economia passa a ter um freio de verdade.

### Bônus colateral

A conquista **Mestre Artesão** (50 crafts), hoje impossível porque só existem 12
upgrades, passa a ser alcançável: os consumíveis contam como craft.

### Como foi implementado

- **Itens:** tabela `user_items` (`user_id`, `item_key`, `quantity`), no
  mesmo padrão de `user_hats`. Definição em `gameConfig/consumables.js`, com
  nome pt-BR/en-US como os chapéus.
- **Craft:** categoria "Consumíveis" no `/craft`, `craftSeconds: 60`, sem
  pré-requisito (repetível). A fila de craft é uma só: são 60s, e evita um
  segundo sistema de fila.
- **Uso:** na tela de oferta do `/planet` aparecem botões "Explorar + Kit",
  "Explorar + Célula" e "Explorar + ambos" (só os que o jogador tem). Os itens
  são gastos numa transação tudo-ou-nada antes de criar a missão.
  - O Kit multiplica os recursos da oferta por 1,25 com arredondamento
    estocástico (valor esperado exato de +25%, mesmo em recurso que cai 1 por
    vez — com `Math.round` o Kit não faria nada num 1).
  - A Célula multiplica o tempo de viagem por 0,6 (vale pra ida e volta).
  - Os itens usados ficam na coluna `boosts_json` da missão, só pra exibir.

---

## 8. Outros ajustes da economia

| Onde | Mudança | Motivo |
|---|---|---|
| `/gift` de ∩oins | **taxa de 5%** (mesma do mercado, reutiliza `getSaleFee`) | Hoje dá para passar ∩oins entre contas sem taxa nem preço mínimo, o que fura as duas proteções do mercado |
| Mercado de recursos | mantém piso 50% e taxa 5% | Com venda para a loja a 25%, o mercado entre jogadores sempre paga 2x mais. Já incentiva a troca |
| Moedas de missão | **sem mudança** | Missão comum ≈ 255 ∩, lendária ≈ 414 ∩. Pouco perto dos recursos, e está certo: o recurso é a recompensa principal |
| `/daily` | **sem mudança** | ~1.500–2.100 ∩ ≈ 15 min de renda de fim de jogo. Não distorce |
| Chapéus | **sem mudança de preço** | Agora caem só ao concluir missão (~0,6/h em vez de ~1,6/h). A loja de chapéus continua sendo um sumidouro cosmético |
| Conquistas | **sem mudança** | As recompensas grandes (300 mil, 1 milhão) estão atrás de metas de centenas de horas. Revisar só se o ranking de ricos explodir |

### Ideia opcional para depois

Hoje a raridade do **chapéu** sorteado não depende da raridade do planeta: só a
chance de aparecer chapéu muda. Um chapéu lendário tem 8% das vezes num planeta
comum ou num lendário. Pesar o sorteio pela raridade do planeta deixaria
planetas lendários mais desejados. É uma mudança pequena em `rollHatDrop`.

---

## 9. O que foi aplicado

1. **Dados:** preços, raridade do Metal, drop do planeta B e receitas
   (seções 3, 4 e 5).
2. **Custo em ∩oins** nos upgrades e **taxa de 5%** no `/gift` de ∩oins.
3. **Consumíveis** (seção 7): a feature que de fato segura a inflação.

A validação (`npm run check-config`) confere ingredientes, `coinsCost` e os
consumíveis.

### Efeito nos jogadores que já existem

- **Inventário:** ninguém perde nada. Os recursos continuam com as mesmas
  chaves.
- **Preço de venda:** quem tem Essência guardada passa a vender por 1.500 em vez
  de 1.250. Quem tem Cristal Roxo, por 375 em vez de 250.
- **Upgrades já feitos:** não são afetados. As receitas novas valem só para os
  próximos níveis.
- **Anúncios abertos no mercado:** anúncios de Essência acima de 6.000 continuam
  válidos (não há teto), mas ninguém vai comprar por mais que a loja.

---

## 10. Limites desta análise

- **Pontos fora do modelo:** o simulador modela um jogador eficiente jogando
  sozinho. Não modela o mercado entre jogadores nem jogadores que deixam
  missões longas rodando offline. Isso acelera a progressão na prática.
- **Estimativas sem simulação:** os efeitos dos consumíveis (seção 7) são
  estimados pela tabela de valor por missão, não por uma simulação completa.
- **Validar depois de aplicar:**
  - acompanhar o total de ∩oins em circulação (`SELECT SUM(coins) FROM users`)
    semana a semana;
  - acompanhar o preço médio dos anúncios de Essência e Pérola no mercado.
