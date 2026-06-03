// 1. ESTADO DA APLICAÇÃO
let meusRanks = [
    { titulo: "APEX CHARACTERS", ranks: [{ l: "T0", c: "s-rank" }, { l: "T0,5", c: "a-rank" }] },
    { titulo: "META CHARACTERS", ranks: [{ l: "T1", c: "b-rank" }, { l: "T1,5", c: "c-rank" }] },
    { titulo: "OFF-META CHARACTERS", ranks: [{ l: "T2", c: "d-rank" }, { l: "T3" }] }
];
let colunasAtuais = 1;
let ordemAtual = 'nome-az';

// Banco de imagens: { id, src, nome, uploadIndex }
let bancoImagens = [];
let uploadCounter = 0;

// Seletores
const inputImagens = document.getElementById('image-input');
const containerFotos = document.getElementById('image-storage');
const board = document.getElementById('board');

// ─────────────────────────────────────────────
// 2. DRAG & DROP
// ─────────────────────────────────────────────
function configurarDrag(elemento) {
    if (elemento._dragConfigurado) return;
    elemento._dragConfigurado = true;

    elemento.addEventListener('dragstart', (e) => {
        if (!elemento.id) elemento.id = 'img-' + Date.now() + Math.random();
        e.dataTransfer.setData("text/plain", e.target.id);
        elemento.classList.add('dragging');
    });
    elemento.addEventListener('dragend', () => {
        elemento.classList.remove('dragging');
    });
}

// ─────────────────────────────────────────────
// 3. CRIAR ELEMENTO IMAGEM
// ─────────────────────────────────────────────
function criarElementoImagem(src, nome) {
    const novaImg = document.createElement('img');
    novaImg.src = src;
    novaImg.className = 'personagem-item';
    novaImg.draggable = true;
    novaImg.title = nome || '';

    configurarDrag(novaImg);

    // ALT + CLIQUE → duplicar
    novaImg.addEventListener('click', (e) => {
        if (e.altKey) {
            const copia = criarElementoImagem(novaImg.src, novaImg.title);
            novaImg.parentElement.appendChild(copia);
            novaImg.style.transform = 'scale(1.2)';
            setTimeout(() => novaImg.style.transform = 'scale(1)', 100);
        }
    });

    return novaImg;
}

// ─────────────────────────────────────────────
// 4. CARREGAR IMAGENS VIA FILE INPUT
// ─────────────────────────────────────────────
inputImagens.addEventListener('change', (e) => {
    const arquivos = Array.from(e.target.files);
    if (!arquivos.length) return;

    let carregados = 0;

    arquivos.forEach((arquivo) => {
        // Evita duplicatas pelo nome
        if (bancoImagens.find(i => i.nome === arquivo.name)) {
            carregados++;
            if (carregados === arquivos.length) finalizarCarregamento();
            return;
        }

        const reader = new FileReader();
        reader.onload = (ev) => {
            const id = 'img-' + Date.now() + Math.random();
            bancoImagens.push({
                id,
                src: ev.target.result,
                nome: arquivo.name,
                uploadIndex: uploadCounter++
            });
            carregados++;
            if (carregados === arquivos.length) finalizarCarregamento();
        };
        reader.readAsDataURL(arquivo);
    });

    // Limpa o input para permitir reselecionar os mesmos arquivos
    e.target.value = '';
});

function finalizarCarregamento() {
    renderizarInventario();
    atualizarContador();
}

// ─────────────────────────────────────────────
// 5. RENDERIZAR INVENTÁRIO COM ORDENAÇÃO
// ─────────────────────────────────────────────
function ordenarInventario(criterio) {
    ordemAtual = criterio;

    // Atualiza botões ativos
    document.querySelectorAll('.sort-btn').forEach(btn => btn.classList.remove('active'));
    const btnAtivo = document.getElementById('sort-' + criterio);
    if (btnAtivo) btnAtivo.classList.add('active');

    renderizarInventario();
}

function renderizarInventario() {
    // Imagens que estão dentro do inventário (não nas tiers)
    const imagensNasTiers = new Set(
        [...document.querySelectorAll('.tier-items img')].map(img => img.id)
    );

    // Só re-renderiza imagens que ainda estão no inventário (não arrastadas)
    const imagensNoInventario = bancoImagens.filter(dados => {
        const elExistente = document.getElementById(dados.id);
        return !elExistente || elExistente.closest('#image-storage');
    });

    // Ordena
    const ordenadas = [...imagensNoInventario].sort((a, b) => {
        if (ordemAtual === 'nome-az') return a.nome.localeCompare(b.nome, 'pt', { numeric: true });
        if (ordemAtual === 'nome-za') return b.nome.localeCompare(a.nome, 'pt', { numeric: true });
        if (ordemAtual === 'upload') return a.uploadIndex - b.uploadIndex;
        return 0;
    });

    // Limpa inventário e re-insere ordenado
    containerFotos.innerHTML = '';

    ordenadas.forEach((dados) => {
        const img = criarElementoImagem(dados.src, dados.nome);
        img.id = dados.id;
        containerFotos.appendChild(img);
    });

    atualizarDestinos();
    atualizarContador();
}

function atualizarContador() {
    const contador = document.getElementById('contador-imagens');
    if (!contador) return;
    const qtd = containerFotos.querySelectorAll('img').length;
    contador.textContent = qtd === 1 ? '1 imagem no inventário' : `${qtd} imagens no inventário`;
}

function limparInventario() {
    if (!confirm('Remover todas as imagens do inventário? (Imagens nas tiers não serão afetadas)')) return;
    // Remove só do banco as que ainda estão no inventário
    const idsNasTiers = new Set(
        [...document.querySelectorAll('.tier-items img')].map(img => img.id)
    );
    bancoImagens = bancoImagens.filter(d => idsNasTiers.has(d.id));
    containerFotos.innerHTML = '';
    atualizarContador();
}

// ─────────────────────────────────────────────
// 6. BOARD (ESTRUTURA DE TIERS)
// ─────────────────────────────────────────────
function mudarColunas(numero) {
    colunasAtuais = numero;
    const imagensPosicionadas = document.querySelectorAll('.tier-items img');
    board.innerHTML = '';

    meusRanks.forEach((grupo) => {
        const sectionWrapper = document.createElement('div');
        sectionWrapper.className = 'tier-section-group';

        const groupHeader = document.createElement('div');
        groupHeader.className = 'group-header';
        groupHeader.innerText = grupo.titulo;
        groupHeader.contentEditable = true;
        sectionWrapper.appendChild(groupHeader);

        const columnHeaderRow = document.createElement('div');
        columnHeaderRow.className = `column-header-row grid-${numero}`;

        for (let i = 1; i <= numero; i++) {
            const colTitle = document.createElement('div');
            colTitle.className = 'col-title-box';
            colTitle.innerText = i === 1 ? 'DPS' : i === 2 ? 'SUPPORT' : 'SUSTAIN';
            colTitle.contentEditable = true;
            columnHeaderRow.appendChild(colTitle);
        }
        sectionWrapper.appendChild(columnHeaderRow);

        const rowsContainer = document.createElement('div');
        rowsContainer.className = 'section-grid';

        grupo.ranks.forEach((rank) => {
            const row = criarLinha(rank, numero);
            rowsContainer.appendChild(row);
        });

        sectionWrapper.appendChild(rowsContainer);
        board.appendChild(sectionWrapper);
    });

    imagensPosicionadas.forEach(img => containerFotos.appendChild(img));
    atualizarDestinos();
}

function criarLinha(rank, numero) {
    const row = document.createElement('div');
    row.className = 'tier-row';

    const label = document.createElement('div');
    label.className = `tier-label ${rank.c || 'f-rank'}`;
    label.innerText = rank.l || 'F';
    label.contentEditable = true;

    const colorPicker = document.createElement('input');
    colorPicker.type = 'color';
    colorPicker.style.display = 'none';
    label.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        colorPicker.click();
    });
    colorPicker.addEventListener('input', (e) => {
        label.style.background = e.target.value;
    });

    const dropContainer = document.createElement('div');
    dropContainer.className = `tier-drop-area grid-${numero}`;

    for (let i = 0; i < numero; i++) {
        const dropZone = document.createElement('div');
        dropZone.className = 'tier-items';
        dropContainer.appendChild(dropZone);
    }

    const btnExcluir = document.createElement('button');
    btnExcluir.className = 'remove-row-btn';
    btnExcluir.innerHTML = '🗑️';
    btnExcluir.onclick = function () {
        if (confirm('Deseja excluir esta linha?')) {
            const imagensNaLinha = row.querySelectorAll('.tier-items img');
            imagensNaLinha.forEach(img => containerFotos.appendChild(img));
            row.remove();
        }
    };

    row.appendChild(label);
    row.appendChild(colorPicker);
    row.appendChild(dropContainer);
    row.appendChild(btnExcluir);
    return row;
}

// ─────────────────────────────────────────────
// 7. DESTINOS DE DROP COM ORDENAÇÃO DINÂMICA
// ─────────────────────────────────────────────

// Usa um WeakSet para registrar quais containers já têm listeners,
// evitando duplicatas sem precisar clonar nós (o clone quebra #image-storage).
const containersComListener = new WeakSet();

function registrarDropZone(container) {
    if (containersComListener.has(container)) return;
    containersComListener.add(container);

    container.addEventListener('dragover', e => {
        e.preventDefault();
        const imagemSendoArrastada = document.querySelector('.dragging');
        if (!imagemSendoArrastada) return;
        const elementoApos = getElementoApos(container, e.clientX, e.clientY);
        if (elementoApos == null) {
            container.appendChild(imagemSendoArrastada);
        } else {
            container.insertBefore(imagemSendoArrastada, elementoApos);
        }
    });

    container.addEventListener('drop', () => {
        atualizarContador();
    });
}

function atualizarDestinos() {
    // Registra tier-items novas (as antigas já têm listener via WeakSet)
    document.querySelectorAll('.tier-items').forEach(registrarDropZone);

    // Inventário: registra uma única vez
    registrarDropZone(containerFotos);

    // Re-configura drag em imagens que ainda não têm id (ex: recém-criadas nas tiers)
    document.querySelectorAll('.tier-items img, #image-storage img').forEach(img => {
        if (!img._dragConfigurado) {
            configurarDrag(img);
            img._dragConfigurado = true;
        }
    });
}

function getElementoApos(container, x, y) {
    const elementos = [...container.querySelectorAll('.personagem-item:not(.dragging)')];
    let elementoMaisProximo = null;
    let menorDistancia = Number.POSITIVE_INFINITY;

    elementos.forEach(el => {
        const box = el.getBoundingClientRect();
        const centroX = box.left + box.width / 2;
        const centroY = box.top + box.height / 2;
        const distancia = Math.hypot(x - centroX, y - centroY);
        if (distancia < menorDistancia) {
            menorDistancia = distancia;
            elementoMaisProximo = el;
        }
    });

    if (!elementoMaisProximo) return null;
    const box = elementoMaisProximo.getBoundingClientRect();
    return x > box.left + box.width / 2 ? elementoMaisProximo.nextSibling : elementoMaisProximo;
}

// ─────────────────────────────────────────────
// 8. BOTÕES DE CONTROLE
// ─────────────────────────────────────────────
function adicionarLinha() {
    meusRanks[meusRanks.length - 1].ranks.push({ l: "?", c: "f-rank" });
    mudarColunas(colunasAtuais);
}

function resetarTierList() {
    if (confirm('Resetar tudo? As imagens carregadas serão perdidas.')) {
        location.reload();
    }
}

// ─────────────────────────────────────────────
// 9. SALVAR COMO IMAGEM
// ─────────────────────────────────────────────
function salvarComoImagem() {
    const areaTierList = document.getElementById('board');
    const lixeiras = document.querySelectorAll('.remove-row-btn');
    lixeiras.forEach(btn => btn.style.display = 'none');

    html2canvas(areaTierList, {
        backgroundColor: "#0b0b0c",
        scale: 2,
        useCORS: true,
        allowTaint: true
    }).then(canvas => {
        const link = document.createElement('a');
        link.download = 'minha-tierlist.png';
        link.href = canvas.toDataURL('image/png');
        link.click();
    }).finally(() => {
        lixeiras.forEach(btn => btn.style.display = 'flex');
    });
}

// ─────────────────────────────────────────────
// 10. CARREGAMENTO AUTOMÁTICO DA PASTA img/
// ─────────────────────────────────────────────
function adicionarAoBanco(src, nome) {
    if (bancoImagens.find(i => i.nome === nome)) return;
    const id = 'img-auto-' + uploadCounter;
    bancoImagens.push({ id, src, nome, uploadIndex: uploadCounter++ });
}

async function carregarPastaImgAutomatico() {
    const statusEl = document.getElementById('status-carregamento');
    if (statusEl) statusEl.textContent = 'Carregando imagens da pasta img/...';

    let i = 1;
    let falhasConsecutivas = 0;
    const MAX_FALHAS = 3;

    while (falhasConsecutivas < MAX_FALHAS) {
        const src = `img/p (${i}).webp`;
        const ok = await testarImagem(src);
        if (ok) {
            adicionarAoBanco(src, `p (${i}).webp`);
            falhasConsecutivas = 0;
        } else {
            falhasConsecutivas++;
        }
        i++;
    }

    if (bancoImagens.length > 0) {
        renderizarInventario();
    }
    if (statusEl) statusEl.textContent = '';
}

function testarImagem(src) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve(true);
        img.onerror = () => resolve(false);
        img.src = src;
    });
}

// ─────────────────────────────────────────────
// 11. INICIALIZAÇÃO
// ─────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    mudarColunas(1);
    carregarPastaImgAutomatico();
    containerFotos.addEventListener('dragover', e => e.preventDefault());
});