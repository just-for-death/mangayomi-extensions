const mangayomiSources = [{
    "id": 204981753,
    "name": "Mangago",
    "lang": "en",
    "baseUrl": "https://www.mangago.me",
    "apiUrl": "",
    "iconUrl": "https://raw.githubusercontent.com/m2k3a/mangayomi-extensions/main/javascript/icon/en.mangago.png",
    "typeSource": "single",
    "itemType": 0,
    "version": "1.2.0",
    "pkgPath": "javascript/manga/src/en/mangago.js"
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

    _absUrl(link) {
        if (!link) return "";
        if (link.startsWith("http")) return link;
        return `https://www.mangago.me${link.startsWith("/") ? "" : "/"}${link}`;
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
                const link = this._absUrl(a.attr("href"));
                const imageUrl = img ? (img.attr("data-src") || img.attr("src") || "") : "";
                if (title && link) {
                    list.push({ name: title.trim(), imageUrl, link });
                }
            }
        }

        return { list, hasNextPage: list.length >= 24 };
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
                const link = this._absUrl(a.attr("href"));
                const imageUrl = img ? (img.attr("data-src") || img.attr("src") || "") : "";
                if (title && link) {
                    list.push({ name: title.trim(), imageUrl, link });
                }
            }
        }

        return { list, hasNextPage: list.length >= 24 };
    }


    getFilterList() {
        return [
            {
                type_name: "HeaderFilter",
                name: "No filters available for this source"
            }
        ];
    }

  
    getFilterList() {
        return [
            {
                type_name: "HeaderFilter",
                name: "No filters available for this source"
            }
        ];
    }

    async search(query, page, filters) {
        const url = `https://www.mangago.me/r/l_search/?name=${encodeURIComponent(query)}&page=${page}`;
        const res = await this.client.get(url, this.getHeaders());
        const doc = new Document(res.body);
        const list = [];
        const seen = new Set();
        const items = doc.querySelectorAll("ul#search_list li, .pic_list .flex1.listitem, #information li, .uk-grid li, .pic_list li, li.listitem");

        for (const item of items) {
            const a = item.querySelector("h2 a, h3 a, a.thm-effect, a[href*='/read-manga/']");
            const img = item.querySelector("img");
            if (a) {
                const title = a.attr("title") || (img ? img.attr("alt") : "") || a.text;
                const link = this._absUrl(a.attr("href"));
                const imageUrl = img ? (img.attr("data-src") || img.attr("src") || "") : "";
                if (title && link && !seen.has(link)) {
                    seen.add(link);
                    list.push({ name: title.trim(), imageUrl, link });
                }
            }
        }

        return { list, hasNextPage: list.length >= 10 };
    }

    async getDetail(url) {
        const fullUrl = this._absUrl(url);
        const res = await this.client.get(fullUrl, this.getHeaders());
        const doc = new Document(res.body);

        const titleEl = doc.querySelector("h1.manga-title, #item_details h1, h1");
        const name = titleEl ? titleEl.text.trim() : "";

        const coverEl = doc.querySelector(".cover img, .book-cover img, #item_details img");
        const imageUrl = coverEl ? (coverEl.attr("data-src") || coverEl.attr("src") || "") : "";

        const descElem = doc.querySelector("#item_details .manga-desc, #item_details .m-desc, .description");
        const description = descElem ? descElem.text.trim() : "";

        const authorElem = doc.querySelector(".manga-author, a[href*='/author/']");
        const author = authorElem ? authorElem.text.trim() : "";

        const genreElems = doc.querySelectorAll(".manga-genres a, a[href*='/genre/']");
        const genre = genreElems ? genreElems.map(g => g.text.trim()).filter(Boolean) : [];

        const chapters = [];
        const rows = doc.querySelectorAll("table#chapter_table tbody tr, #chapter_table tr, .chapter_list tr");

        for (const row of rows) {
            const a = row.querySelector("a.chico, a.chpt, a[href*='/chapter/'], a[href*='/read-manga/'], td:first-child a");
            if (a) {
                const chName = a.text.trim();
                const chLink = this._absUrl(a.attr("href"));
                if (chName && chLink && !chLink.includes("/home/people/") && !chLink.includes("/upload/")) {
                    chapters.push({ name: chName, url: chLink });
                }
            }
        }

        return { name, title: name, imageUrl, description, author, genre, chapters };
    }

    async getPageList(url) {
        const fullUrl = this._absUrl(url);
        const res = await this.client.get(fullUrl, this.getHeaders());
        const html = res.body || "";
        const pages = [];
        const seen = new Set();
        
        let totalPages = 1;
        const totalMatch = html.match(/total_pages\s*=\s*(\d+)/);
        if (totalMatch) {
            totalPages = parseInt(totalMatch[1], 10);
        }
        
        const extractFromHtml = (h) => {
            const doc = new Document(h);
            const allImgs = doc.querySelectorAll("img");
            for (const img of allImgs) {
                const src = img.attr("data-src") || img.attr("src") || img.attr("data-original") || "";
                if (src && src.startsWith("http") && !src.endsWith(".js") && !src.endsWith(".css") && !src.includes("avatar") && !src.includes("arrow") && !src.includes("logo") && !src.includes("backtotop") && !src.includes("pubfuture") && !src.includes("pubadx") && !src.includes("loader") && !seen.has(src)) {
                    if (src.includes("mangapicgallery.com") || src.includes("/r/newpiclink/") || src.includes("/r/piclink/")) {
                        const httpSrc = src.replace(/^https:\/\/iweb_/, "http://iweb_");
                        seen.add(httpSrc);
                        pages.push({ url: httpSrc, headers: { "Referer": "https://www.mangago.me/" } });
                    }
                }
            }
        };
        
        extractFromHtml(html);
        
        if (totalPages > 1) {
            let baseUrl = fullUrl.split('?')[0];
            if (baseUrl.endsWith('/')) baseUrl = baseUrl.slice(0, -1);
            if (baseUrl.includes('/pg-')) {
                baseUrl = baseUrl.substring(0, baseUrl.lastIndexOf('/pg-'));
            }
            for (let i = 2; i <= totalPages; i++) {
                const pageUrl = `${baseUrl}/pg-${i}/`;
                const pageRes = await this.client.get(pageUrl, this.getHeaders());
                extractFromHtml(pageRes.body || "");
            }
        }
        
        return pages;
    }
}
