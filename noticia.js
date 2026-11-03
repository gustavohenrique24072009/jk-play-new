
"use strict";

const STORAGE_NEWS_ARTICLE = "jkplay_noticias";

function lerNoticias() {
    try {
        const dados = JSON.parse(localStorage.getItem(STORAGE_NEWS_ARTICLE) || "[]");
        return Array.isArray(dados) ? dados : [];
    } catch (error) {
        console.error("Erro ao carregar notícias:", error);
        return [];
    }
}

function normalizarNoticia(item) {
    return {
        id: String(item.id ?? ""),
        titulo: item.title ?? item.titulo ?? "Sem título",
        resumo: item.summary ?? item.resumo ?? "",
        categoria: item.category ?? item.categoria ?? "Notícia",
        autor: item.author ?? item.autor ?? "JK Play News",
        data: item.date ?? item.data ?? "",
        imagem: item.image ?? item.imagem ?? "",
        conteudo: item.content ?? item.conteudo ?? item.summary ?? item.resumo ?? "",
        publicado: item.publicado !== false && item.published !== false
    };
}

function escaparHTML(texto = "") {
    return String(texto).replace(/[&<>"']/g, caractere => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    })[caractere]);
}

function formatarData(data) {
    if (!data) return "";

    const correspondencia = String(data).match(/^(\d{4})-(\d{2})-(\d{2})$/);

    if (correspondencia) {
        return `${correspondencia[3]}/${correspondencia[2]}/${correspondencia[1]}`;
    }

    const dataConvertida = new Date(data);
    if (Number.isNaN(dataConvertida.getTime())) return String(data);

    return dataConvertida.toLocaleDateString("pt-BR");
}

function mostrarNoticiaNaoEncontrada() {
    document.getElementById("article-content").innerHTML = `
        <h1>Notícia não encontrada</h1>
        <p>Essa notícia não existe ou não está disponível.</p>
        <a href="index.html">Voltar para o portal</a>
    `;
}

function carregarNoticia() {
    const parametros = new URLSearchParams(window.location.search);
    const id = parametros.get("id");

    const noticias = lerNoticias()
        .map(normalizarNoticia)
        .filter(noticia => noticia.publicado);

    const noticia = noticias.find(item => item.id === String(id));

    if (!noticia) {
        mostrarNoticiaNaoEncontrada();
        return;
    }

    document.title = `${noticia.titulo} | JK Play News`;

    document.getElementById("article-category").textContent = noticia.categoria;
    document.getElementById("article-title").textContent = noticia.titulo;
    document.getElementById("article-summary").textContent = noticia.resumo;
    document.getElementById("article-author").textContent =
        `Por ${noticia.autor || "Equipe JK Play"}`;
    document.getElementById("article-date").textContent = formatarData(noticia.data);

    const capa = document.getElementById("article-cover");

    if (noticia.imagem) {
        capa.src = noticia.imagem;
        capa.alt = noticia.titulo;
        capa.style.display = "";
    } else {
        capa.removeAttribute("src");
        capa.alt = "";
        capa.style.display = "none";
    }

    const corpo = document.getElementById("article-body");
    corpo.replaceChildren();

    String(noticia.conteudo || noticia.resumo)
        .split(/\n+/)
        .map(paragrafo => paragrafo.trim())
        .filter(Boolean)
        .forEach(paragrafo => {
            const elemento = document.createElement("p");
            elemento.textContent = paragrafo;
            corpo.appendChild(elemento);
        });

    document.getElementById("share-button").addEventListener("click", async () => {
        const dadosCompartilhamento = {
            title: noticia.titulo,
            text: noticia.resumo,
            url: window.location.href
        };

        if (navigator.share) {
            try {
                await navigator.share(dadosCompartilhamento);
            } catch (error) {
                console.log("Compartilhamento cancelado.");
            }
            return;
        }

        try {
            await navigator.clipboard.writeText(window.location.href);
            alert("Link da notícia copiado!");
        } catch (error) {
            prompt("Copie o link da notícia:", window.location.href);
        }
    });

    const relacionadas = noticias
        .filter(item => item.id !== noticia.id)
        .slice(0, 3);

    const containerRelacionadas = document.getElementById("related-news");

    if (relacionadas.length === 0) {
        containerRelacionadas.innerHTML = "<p>Não há outras notícias para mostrar.</p>";
        return;
    }

    containerRelacionadas.innerHTML = relacionadas.map(item => `
        <article class="news-card">
            <a href="noticia.html?id=${encodeURIComponent(item.id)}">
                ${
                    item.imagem
                        ? `<img src="${escaparHTML(item.imagem)}" alt="${escaparHTML(item.titulo)}">`
                        : `<div class="news-card-image-placeholder"></div>`
                }

                <div class="news-card-content">
                    <span class="news-card-category">
                        ${escaparHTML(item.categoria)}
                    </span>

                    <h3>${escaparHTML(item.titulo)}</h3>

                    <p>${escaparHTML(item.resumo)}</p>

                    <span class="news-card-date">
                        ${escaparHTML(formatarData(item.data))}
                    </span>
                </div>
            </a>
        </article>
    `).join("");
}

document.addEventListener("DOMContentLoaded", carregarNoticia);
