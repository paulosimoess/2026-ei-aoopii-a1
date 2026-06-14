# AOOP A1 - AR Face Filters

## Membros do grupo

* Paulo Simões, Nº 31377
* Francisco Matos, Nº 31406

## Track

A - Deep Learning

## Descrição do projeto

Este projeto consiste numa aplicação web de filtros faciais em tempo real, desenvolvida com HTML, CSS e JavaScript. A aplicação utiliza a webcam do utilizador para detetar pontos de referência da face e aplicar filtros visuais diretamente sobre o rosto.

A ideia principal é criar uma experiência interativa de realidade aumentada, inspirada em aplicações como Snapchat, Instagram e TikTok, explorando técnicas de visão por computador, renderização em canvas e integração de modelos 3D.

A aplicação permite aplicar filtros 2D, filtros 3D e efeitos visuais sobre a face, acompanhando os movimentos do utilizador em tempo real.

## Tecnologias utilizadas

* HTML5
* CSS3
* JavaScript
* MediaPipe Tasks Vision
* FaceLandmarker
* Three.js
* Canvas 2D
* WebGL
* LocalStorage
* Modelos 3D em formato GLB

## Funcionalidades principais

A aplicação inclui as seguintes funcionalidades:

* Deteção facial em tempo real através da webcam.
* Identificação de landmarks faciais com MediaPipe.
* Aplicação de filtros 2D sobre zonas específicas do rosto.
* Aplicação de filtros 3D com modelos GLB usando Three.js.
* Aplicação de efeitos visuais em canvas.
* Ajuste manual de tamanho, posição e rotação dos filtros.
* Ajustes específicos para filtros 3D, incluindo rotação nos eixos X e Y.
* Sistema de presets para guardar combinações de filtros e ajustes.
* Captura de fotografia com os filtros aplicados.
* Pré visualização e transferência da imagem capturada.
* Botão para mostrar ou ocultar a deteção facial.
* Botão para limpar todos os filtros selecionados.
* Organização dos filtros por categorias.
* Compatibilidade controlada entre filtros para evitar combinações sobrepostas.

## Tipos de filtros implementados

### Filtros 2D

Os filtros 2D são desenhados sobre o canvas e acompanham a posição da face. Estes filtros são aplicados em zonas como cabeça, olhos e boca.

Exemplos:

* Chapéu
* Coroa
* Chapéu de Natal
* Chapéu de bruxa
* Máscara
* Bigode
* Óculos
* Pixel Glasses
* Neon Mask

### Filtros 3D

Os filtros 3D são carregados a partir de modelos GLB e renderizados com Three.js. Estes filtros acompanham a posição e rotação da cabeça, criando uma sensação de maior profundidade.

Exemplos:

* Óculos 3D
* Chapéu 3D

### Efeitos visuais

Os efeitos visuais são desenhados diretamente em canvas e aplicados sobre a zona da face.

Exemplos:

* Glitch
* Inferno
* Matrix

## Sistema de compatibilidade entre filtros

A aplicação utiliza uma lógica de slots para controlar que filtros podem estar ativos ao mesmo tempo. Esta abordagem evita combinações incoerentes, como vários chapéus ou vários óculos ao mesmo tempo.

Os filtros estão organizados por zonas:

* Cabeça
* Olhos
* Boca
* Face completa
* Efeitos

Desta forma, é possível combinar filtros de zonas diferentes, por exemplo:

* Chapéu 3D + Óculos 3D
* Chapéu 3D + Óculos 3D + Matrix
* Pixel Glasses + Inferno

No entanto, filtros da mesma zona substituem-se.

## Ajustes e presets

Cada filtro pode ser ajustado individualmente através de sliders. Os ajustes disponíveis incluem:

* Tamanho
* Posição horizontal
* Posição vertical
* Rotação lateral
* Inclinação frente/trás, em filtros 3D
* Rotação esquerda/direita, em filtros 3D

A aplicação também permite guardar presets. Um preset guarda a combinação de filtros selecionados e os respetivos ajustes, permitindo aplicar rapidamente estilos criados pelo utilizador.

## Captura de fotografia

A aplicação permite tirar uma fotografia com a webcam e guardar a imagem com os filtros aplicados. A captura inclui:

* Imagem da webcam
* Filtros 2D
* Filtros 3D
* Efeitos visuais

Após a captura, a imagem pode ser visualizada em maior dimensão e transferida no formato PNG.

## Como executar o projeto

Para executar a aplicação, basta abrir o projeto num servidor local.

Uma forma simples é utilizar a extensão Live Server no Visual Studio Code.

Passos:

1. Abrir a pasta do projeto no Visual Studio Code.
2. Abrir o ficheiro `index.html`.
3. Clicar em `Go Live`.
4. Permitir o acesso à webcam no navegador.
5. Utilizar a aplicação no browser.

Recomenda-se a utilização do Google Chrome para melhor compatibilidade com a webcam, MediaPipe e WebGL.

## Estrutura geral do projeto

O projeto está organizado de forma a separar os ficheiros principais da aplicação, os módulos JavaScript, os assets e os recursos de apoio.

```txt
.
├── data
│   └── .gitkeep
├── docs
│   └── .gitkeep
├── notebooks
│   └── .gitkeep
├── src
│   ├── assets
│   │   ├── filters
│   │   ├── thumbnails
│   │   └── models3d
│   ├── js
│   │   ├── config
│   │   │   └── filters-data.js
│   │   ├── core
│   │   │   ├── face-utils.js
│   │   │   └── storage-utils.js
│   │   └── render
│   │       ├── effects-renderer.js
│   │       ├── filters-renderer.js
│   │       └── three-renderer.js
│   ├── models
│   │   └── face_landmarker.task
│   ├── app.js
│   ├── index.html
│   └── style.css
└── README.md
```

A pasta `src` contém a aplicação principal. O ficheiro `index.html` define a estrutura da interface, o `style.css` contém os estilos visuais e o `app.js` coordena a deteção facial, a seleção de filtros, os ajustes, os presets e a captura de fotografia.

Dentro da pasta `js`, o código está dividido por responsabilidades. A pasta `config` contém a configuração dos filtros e categorias, a pasta `core` contém funções auxiliares relacionadas com landmarks, posições da face e armazenamento, e a pasta `render` contém os módulos responsáveis por desenhar filtros 2D, filtros 3D e efeitos visuais.

A pasta `models` contém o modelo `face_landmarker.task`, usado pelo MediaPipe para a deteção facial. A pasta `assets` contém os recursos visuais da aplicação, incluindo imagens de filtros, miniaturas e modelos 3D.


## Limitações conhecidas

Apesar de a aplicação já permitir filtros 2D, 3D e efeitos visuais em tempo real, existem algumas limitações:

* Os filtros 3D dependem da qualidade e orientação dos modelos GLB utilizados.
* A rotação 3D é calculada com base nos landmarks faciais e pode não ser perfeita em todos os ângulos.
* A iluminação e qualidade da webcam podem influenciar a precisão da deteção facial.
* Alguns efeitos visuais são aproximados e foram adaptados para funcionar em tempo real no canvas.

## Possíveis melhorias futuras

Como melhorias futuras, poderiam ser implementadas as seguintes funcionalidades:

* Utilização direta da matriz de transformação facial fornecida pelo MediaPipe para melhorar o alinhamento 3D.
* Oclusão facial para tornar os modelos 3D mais realistas.
* Mais filtros 3D com modelos otimizados para realidade aumentada.
* Interface específica para criar novos filtros personalizados.

## Conclusão

Este projeto permitiu explorar conceitos de visão por computador, deteção facial, realidade aumentada e renderização em tempo real no browser. A aplicação combina MediaPipe para deteção facial, Canvas 2D para filtros e efeitos visuais, e Three.js para renderização de modelos 3D.

O resultado final é uma aplicação interativa que permite aplicar, ajustar, combinar, guardar e capturar filtros faciais em tempo real.
