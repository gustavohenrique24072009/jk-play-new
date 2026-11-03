
"use strict";

const STORAGE_NEWS = "jkplay_noticias";

function lerNoticias() {
    try {
        const dados = JSON.parse(localStorage.getItem(STORAGE_NEWS) || "[]");
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

    // Datas no formato YYYY-MM-DD são formatadas sem problemas de fuso horário.
    const correspondencia = String(data).match(/^(\d{4})-(\d{2})-(\d{2})$/);

    if (correspondencia) {
        return `${correspondencia[3]}/${correspondencia[2]}/${correspondencia[1]}`;
    }

    const dataConvertida = new Date(data);
    if (Number.isNaN(dataConvertida.getTime())) return String(data);

    return dataConvertida.toLocaleDateString("pt-BR");
}

function carregarNoticias() {
    const container = document.getElementById("news-grid");
    if (!container) return;

    const noticias = lerNoticias()
        .map(normalizarNoticia)
        .filter(noticia => noticia.publicado);

    if (noticias.length === 0) {
        container.innerHTML = `
            <p class="empty-state">
                Nenhuma notícia publicada ainda.
            </p>
        `;
        return;
    }

    container.innerHTML = noticias.map(noticia => `
        <article class="news-card">
            <a href="noticia.html?id=${encodeURIComponent(noticia.id)}">
                ${
                    noticia.imagem
                        ? `<img src="${escaparHTML(noticia.imagem)}" alt="${escaparHTML(noticia.titulo)}">`
                        : `<div class="news-card-image-placeholder"></div>`
                }

                <div class="news-card-content">
                    <span class="news-card-category">
                        ${escaparHTML(noticia.categoria)}
                    </span>

                    <h3>${escaparHTML(noticia.titulo)}</h3>

                    <p>${escaparHTML(noticia.resumo)}</p>

                    <span class="news-card-date">
                        ${escaparHTML(formatarData(noticia.data))}
                    </span>
                </div>
            </a>
        </article>
    `).join("");
}

document.addEventListener("DOMContentLoaded", carregarNoticias);
