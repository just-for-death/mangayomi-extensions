const mangayomiSources = [
  {
    "name": "MangaDex",
    "lang": "en",
    "id": 182736451,
    "baseUrl": "https://mangadex.org",
    "apiUrl": "https://api.mangadex.org",
    "iconUrl": "https://mangadex.org/favicon.ico",
    "typeSource": "single",
    "isManga": true,
    "isNsfw": false,
    "version": "1.0.0",
    "pkgPath": "javascript/manga/src/en/mangadex.js"
  }
];

class DefaultExtension extends MProvider {
  constructor() {
    super();
    this.client = new Client();
  }

  getHeaders() {
    return {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Mangayomi",
      "Content-Type": "application/json"
    };
  }

  _parseList(data) {
    const list = [];
    if (!data || !data.data) return list;
    
    for (const m of data.data) {
      let title = m.attributes?.title?.en || m.attributes?.title?.['ja-ro'] || "Unknown";
      let coverFileName = "";
      
      if (m.relationships) {
        for (const rel of m.relationships) {
          if (rel.type === "cover_art" && rel.attributes && rel.attributes.fileName) {
            coverFileName = rel.attributes.fileName;
          }
        }
      }
      
      let imageUrl = coverFileName ? \`https://uploads.mangadex.org/covers/\${m.id}/\${coverFileName}.256.jpg\` : "";
      
      list.push({
        name: title,
        link: m.id,
        imageUrl: imageUrl
      });
    }
    return list;
  }

  async getPopular(page) {
    const offset = (page - 1) * 20;
    const url = \`https://api.mangadex.org/manga?limit=20&offset=\${offset}&includes[]=cover_art&order[followedCount]=desc&availableTranslatedLanguage[]=en\`;
    const res = await this.client.get(url, this.getHeaders());
    const data = JSON.parse(res.body);
    return {
      list: this._parseList(data),
      hasNextPage: data.total > offset + 20
    };
  }

  async getLatestUpdates(page) {
    const offset = (page - 1) * 20;
    const url = \`https://api.mangadex.org/manga?limit=20&offset=\${offset}&includes[]=cover_art&order[updatedAt]=desc&availableTranslatedLanguage[]=en\`;
    const res = await this.client.get(url, this.getHeaders());
    const data = JSON.parse(res.body);
    return {
      list: this._parseList(data),
      hasNextPage: data.total > offset + 20
    };
  }

  async search(query, page, filters) {
    const offset = (page - 1) * 20;
    const q = encodeURIComponent(query);
    const url = \`https://api.mangadex.org/manga?limit=20&offset=\${offset}&title=\${q}&includes[]=cover_art&availableTranslatedLanguage[]=en\`;
    const res = await this.client.get(url, this.getHeaders());
    const data = JSON.parse(res.body);
    return {
      list: this._parseList(data),
      hasNextPage: data.total > offset + 20
    };
  }

  async getDetail(url) {
    const mangaId = url;
    
    // Get manga info
    const infoUrl = \`https://api.mangadex.org/manga/\${mangaId}?includes[]=cover_art&includes[]=author\`;
    const infoRes = await this.client.get(infoUrl, this.getHeaders());
    const m = JSON.parse(infoRes.body).data;
    
    let title = m.attributes?.title?.en || m.attributes?.title?.['ja-ro'] || "Unknown";
    let desc = m.attributes?.description?.en || "";
    let status = m.attributes?.status === "ongoing" ? 0 : 1;
    let author = "";
    let coverFileName = "";
    
    for (const rel of (m.relationships || [])) {
      if (rel.type === "cover_art" && rel.attributes) coverFileName = rel.attributes.fileName;
      if (rel.type === "author" && rel.attributes) author = rel.attributes.name;
    }
    
    let imageUrl = coverFileName ? \`https://uploads.mangadex.org/covers/\${m.id}/\${coverFileName}\` : "";
    let tags = (m.attributes?.tags || []).map(t => t.attributes?.name?.en || "").filter(t => t);

    // Get chapters (paginated to max 500)
    let chapters = [];
    const limit = 500;
    const chUrl = \`https://api.mangadex.org/manga/\${mangaId}/feed?limit=\${limit}&translatedLanguage[]=en&order[chapter]=desc\`;
    
    try {
      const chRes = await this.client.get(chUrl, this.getHeaders());
      const chData = JSON.parse(chRes.body);
      for (const ch of (chData.data || [])) {
        let chTitle = ch.attributes.title ? \` - \${ch.attributes.title}\` : "";
        let chNum = ch.attributes.chapter ? \`Chapter \${ch.attributes.chapter}\` : "Oneshot";
        
        let dateUpload = new Date(ch.attributes.readableAt || ch.attributes.publishAt || ch.attributes.createdAt).getTime().toString();
        
        chapters.push({
          name: chNum + chTitle,
          url: ch.id,
          dateUpload: dateUpload
        });
      }
    } catch (_) {}

    return {
      name: title,
      imageUrl: imageUrl,
      description: desc,
      status: status,
      author: author,
      genre: tags,
      chapters: chapters
    };
  }

  async getPageList(url) {
    const chapterId = url;
    const apiUrl = \`https://api.mangadex.org/at-home/server/\${chapterId}\`;
    const res = await this.client.get(apiUrl, this.getHeaders());
    const data = JSON.parse(res.body);
    
    const host = data.baseUrl;
    const hash = data.chapter.hash;
    const pages = [];
    
    for (const page of data.chapter.data) {
      pages.push({ url: \`\${host}/data/\${hash}/\${page}\` });
    }
    
    return pages;
  }
}
