const mangayomiSources = [{
    "name": "Mangago",
    "lang": "en",
    "baseUrl": "https://www.mangago.me",
    "apiUrl": "",
    "iconUrl": "https://raw.githubusercontent.com/m2k3a/mangayomi-extensions/main/javascript/icon/en.mangago.png",
    "typeSource": "single",
    "itemType": 0,
    "version": "1.0.0",
    "pkgPath": "manga/src/en/mangago.js"
}];

class DefaultExtension extends MProvider {
    constructor() {
        super();
        this.client = new Client();
    }

    getHeaders() {
        return {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Referer": "https://www.mangago.me/"
        };
    }

    async getPopular(page) {
        const url = `https://www.mangago.me/genre/all/${page}/?f=1&o=1&sortby=view&e=`;
        const res = await this.client.get(url, this.getHeaders());
        const doc = new Document(res.body);
        const list = [];
        const items = doc.querySelectorAll(".updatesli, .flex1.listitem, #information li, .pic_list li");

        for (const item of items) {
            const a = item.querySelector("a.thm-effect, span.title a, a");
            const img = item.querySelector("img");
            if (a) {
                const title = a.attr("title") || a.attr("alt") || (img ? img.attr("alt") : "") || a.text;
                const link = a.attr("href");
                const imageUrl = img ? (img.attr("data-src") || img.attr("src")) : "";
                if (title && link) {
                    list.push({
                        name: title.trim(),
                        imageUrl: imageUrl,
                        link: link
                    });
                }
            }
        }

        return {
            list: list,
            hasNextPage: list.length >= 24
        };
    }

    async getLatestUpdates(page) {
        const url = `https://www.mangago.me/genre/all/${page}/?f=1&o=1&sortby=update&e=`;
        const res = await this.client.get(url, this.getHeaders());
        const doc = new Document(res.body);
        const list = [];
        const items = doc.querySelectorAll(".pic_list .flex1.listitem, #information li, .updatesli, .pic_list li");

        for (const item of items) {
            const a = item.querySelector("a.thm-effect, a");
            const img = item.querySelector("img");
            if (a) {
                const title = a.attr("title") || (img ? img.attr("alt") : "") || a.text;
                const link = a.attr("href");
                const imageUrl = img ? (img.attr("data-src") || img.attr("src")) : "";
                if (title && link) {
                    list.push({
                        name: title.trim(),
                        imageUrl: imageUrl,
                        link: link
                    });
                }
            }
        }

        return {
            list: list,
            hasNextPage: list.length >= 24
        };
    }

    async search(query, page, filters) {
        const url = `https://www.mangago.me/r/l_search/?name=${encodeURIComponent(query)}&page=${page}`;
        const res = await this.client.get(url, this.getHeaders());
        const doc = new Document(res.body);
        const list = [];
        const items = doc.querySelectorAll(".pic_list .flex1.listitem, #information li, .uk-grid li, .pic_list li");

        for (const item of items) {
            const a = item.querySelector("a.thm-effect, a");
            const img = item.querySelector("img");
            if (a) {
                const title = a.attr("title") || (img ? img.attr("alt") : "") || a.text;
                const link = a.attr("href");
                const imageUrl = img ? (img.attr("data-src") || img.attr("src")) : "";
                if (title && link) {
                    list.push({
                        name: title.trim(),
                        imageUrl: imageUrl,
                        link: link
                    });
                }
            }
        }

        return {
            list: list,
            hasNextPage: list.length >= 20
        };
    }

    async getDetail(url) {
        const res = await this.client.get(url, this.getHeaders());
        const doc = new Document(res.body);

        const descElem = doc.querySelector("#item_details .manga-desc, #item_details .m-desc, .description");
        const description = descElem ? descElem.text.trim() : "";

        const authorElem = doc.querySelector(".manga-author, a[href*='/author/']");
        const author = authorElem ? authorElem.text.trim() : "";

        const genreElems = doc.querySelectorAll(".manga-genres a, a[href*='/genre/']");
        const genres = genreElems ? genreElems.map(g => g.text.trim()).filter(Boolean) : [];

        const chapters = [];
        const rows = doc.querySelectorAll("table#chapter_table tbody tr, #chapter_table tr, .chapter_list tr");

        for (const row of rows) {
            const a = row.querySelector("a.chpt, a[href*='/read-manga/'], a");
            if (a) {
                const name = a.text.trim();
                const link = a.attr("href");
                if (name && link && !link.includes("/home/people/")) {
                    chapters.push({
                        name: name,
                        url: link
                    });
                }
            }
        }

        return {
            description: description,
            author: author,
            genre: genres,
            chapters: chapters
        };
    }

    async getPageList(url) {
        const fullUrl = url.startsWith('http') ? url : `https://www.mangago.me${url.startsWith('/') ? '' : '/'}${url}`;
        const res = await this.client.get(fullUrl, this.getHeaders());
        const doc = new Document(res.body);
        const pages = [];
        const seen = new Set();

        // 1. Check img tags with specific selectors
        const imgs = doc.querySelectorAll("#pic_container img, img#comic_page, .page-image img, #page_list img, .manga_pic, img[src*='mangapicgallery'], img[data-src*='mangapicgallery']");
        for (const img of imgs) {
            const src = img.attr("data-src") || img.attr("src") || img.attr("data-original") || "";
            if (src && src.startsWith("http") && !src.includes("avatar") && !src.includes("arrow") && !src.includes("logo") && !seen.has(src)) {
                seen.add(src);
                pages.push({
                    url: src,
                    headers: { "Referer": "https://www.mangago.me/" }
                });
            }
        }

        // 2. Check if imgsrcs string is in the HTML
        const html = res.body || "";
        const match = html.match(/var\s+imgsrcs\s*=\s*['"]([^'"]+)['"]/);
        if (match && match[1] && pages.length === 0) {
            try {
                const raw = atob(match[1]);
                const urls = raw.split(",").filter(u => u.startsWith("http"));
                for (const u of urls) {
                    if (!seen.has(u)) {
                        seen.add(u);
                        pages.push({
                            url: u,
                            headers: { "Referer": "https://www.mangago.me/" }
                        });
                    }
                }
            } catch (_) {}
        }

        return pages;
    }
}