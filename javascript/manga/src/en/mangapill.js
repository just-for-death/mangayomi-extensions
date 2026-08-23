const mangayomiSources = [
  {
    "name": "Mangapill",
    "id": 960321322,
    "lang": "en",
    "baseUrl": "https://mangapill.com",
    "apiUrl": "",
    "iconUrl":
      "https://www.google.com/s2/favicons?sz=64&domain=https://mangapill.com/",
    "typeSource": "single",
    "isManga": true,
    "version": "1.0.4",
    "dateFormat": "",
    "dateFormatLocale": "",
    "pkgPath": "manga/src/en/mangapill.js",
  },
];

class DefaultExtension extends MProvider {
  getHeaders(url) {
    return {
      "Referer": this.source.baseUrl,
    };
  }

  statusCode(status) {
    return (
      {
        "publishing": 0,
        "finished": 1,
        "on hiatus": 2,
        "discontinued": 3,
        "not yet published": 4,
      }[status] ?? 5
    );
  }

  async getPreference(key) {
    const preferences = new SharedPreferences();
    return parseInt(preferences.get(key));
  }

  async getMangaList(slug) {
    var cleanSlug = slug || "mangas";
    var url = cleanSlug.startsWith('http') ? cleanSlug : `${this.source.baseUrl}/${cleanSlug.replace(/^\//, '')}`;
    var res = await new Client().get(url, this.getHeaders());
    var doc = new Document(res.body);
    var list = [];
    var mangaElements = doc.select("div[class*='grid'] > div, div.grid > div");
    for (var manga of mangaElements) {
      var a = manga.selectFirst("a[href*='/manga/']");
      var img = manga.selectFirst("img");
      if (a && img) {
        var link = a.getHref;
        var imageUrl = img.getSrc || img.attr("data-src") || img.attr("src") || "";
        var nameDiv = manga.selectFirst("div.font-black, div.font-bold, .line-clamp-2, a.mb-2");
        var name = (nameDiv ? nameDiv.text : a.text).trim();
        if (name && link && !list.some(x => x.link === link)) {
          list.push({
            name,
            imageUrl: imageUrl.startsWith("//") ? `https:${imageUrl}` : imageUrl,
            link: link.startsWith("http") ? link : `${this.source.baseUrl}${link.startsWith('/') ? link : '/' + link}`
          });
        }
      }
    }
    return { list, hasNextPage: list.length >= 10 };
  }

  async getNavPage(prefKey) {
    var val = await this.getPreference(prefKey);
    var slug = "mangas/new";
    if (val == 2) {
      slug = "chapters";
    }
    return await this.getMangaList(slug);
  }

  async getPopular(page) {
    return await this.getNavPage("pref_popular_content");
  }
  get supportsLatest() {
    throw new Error("supportsLatest not implemented");
  }

  async getLatestUpdates(page) {
    return await this.getNavPage("pref_latest_content");
  }

  async searchManga(query, status, type, genre, page) {
    var slug = `search?q=${query}&status=${status}&type=${type}${genre}&page=${page}`;
    return await this.getMangaList(slug);
  }

  async search(query, page, filters) {
    var type = (filters && filters[0]?.values && filters[0]?.state != null) ? filters[0].values[filters[0].state]?.value ?? "" : "";
    var status = (filters && filters[1]?.values && filters[1]?.state != null) ? filters[1].values[filters[1].state]?.value ?? "" : "";

    var genre = "";
    if (filters && filters[2] && Array.isArray(filters[2].state)) {
      for (var filter of filters[2].state) {
        if (filter && filter.state == true) genre += `&genre=${filter.value}`;
      }
    }
    return await this.searchManga(query || "", status, type, genre, page);
  }

  async getMangaDetail(slug) {
    var lang = await this.getPreference("pref_title_lang");
    var baseUrl = this.source.baseUrl;
    if (slug.includes(baseUrl)) slug = slug.replace(baseUrl, "");

    var link = `${baseUrl}${slug}`;
    var res = await new Client().get(link, this.getHeaders());
    var doc = new Document(res.body);

    var mangaName = doc.selectFirst(".mb-3 .font-bold.text-lg").text;
    if (doc.selectFirst(".mb-3 .text-sm.text-secondary") && lang == 2)
      mangaName = doc.selectFirst(".mb-3 .text-sm.text-secondary").text;
    var description = doc
      .selectFirst("meta[name='description']")
      .attr("content");
    var imageUrl = doc.selectFirst(".w-full.h-full").getSrc;
    var statusText = doc
      .select(".grid.grid-cols-1 > div")[1]
      .selectFirst("div").text;
    var status = this.statusCode(statusText);

    var genre = [];
    var genreList = doc.select("a.mr-1");
    for (var gen of genreList) {
      genre.push(gen.text);
    }

    var chapters = [];
    var chapList = doc.select("div.my-3.grid > a");
    for (var chap of chapList) {
      var name = chap.text;
      var url = chap.getHref;
      chapters.push({ name, url });
    }
    return {
      name: mangaName,
      description,
      link,
      imageUrl,
      status,
      genre,
      chapters,
    };
  }

  async getDetail(url) {
    return await this.getMangaDetail(url);
  }
  // For anime episode video list
  async getVideoList(url) {
    throw new Error("getVideoList not implemented");
  }

  // For manga chapter pages
  async getPageList(url) {
    var link = url.startsWith('http') ? url : `${this.source.baseUrl}${url.startsWith('/') ? url : '/' + url}`;

    var res = await new Client().get(link, this.getHeaders());
    var doc = new Document(res.body);

    var urls = [];

    var pages = doc.select("chapter-page");
    for (var page of pages) {
      var img = page.selectFirst("img") ? page.selectFirst("img").getSrc : null;
      if (img != null) urls.push(img);
    }
    if (urls.length === 0) {
      var fallbackImgs = doc.select("picture img, div.flex.flex-col img, img");
      for (var fImg of fallbackImgs) {
        var src = fImg.getSrc || fImg.attr("data-src") || fImg.attr("src");
        if (src && !urls.includes(src) && !src.includes("logo") && !src.includes("banner")) urls.push(src);
      }
    }

    return urls;
  }

  getFilterList() {
    return [
      {
        type_name: "SelectFilter",
        name: "Type",
        state: 0,
        values: [
          ["All", ""],
          ["Manga", "manga"],
          ["Novel", "novel"],
          ["One-Shot", "one-shot"],
          ["Doujinshi", "doujinshi"],
          ["Manhwa", "manhwa"],
          ["Manhua", "manhua"],
          ["Oel", "oel"],
        ].map((x) => ({ type_name: "SelectOption", name: x[0], value: x[1] })),
      },
      {
        type_name: "SelectFilter",
        name: "Status",
        state: 0,
        values: [
          ["All", ""],
          ["Publishing", "publishing"],
          ["Finished", "finished"],
          ["On hiatus", "on hiatus"],
          ["Discontinued", "discontinued"],
          ["Not yet published", "not yet published"],
        ].map((x) => ({ type_name: "SelectOption", name: x[0], value: x[1] })),
      },
      {
        type_name: "GroupFilter",
        name: "Genre",
        state: [
          ["Action", "Action"],
          ["Adventure", "Adventure"],
          ["Cars", "Cars"],
          ["Comedy", "Comedy"],
          ["Dementia", "Dementia"],
          ["Demons", "Demons"],
          ["Doujinshi", "Doujinshi"],
          ["Drama", "Drama"],
          ["Ecchi", "Ecchi"],
          ["Fantasy", "Fantasy"],
          ["Game", "Game"],
          ["Gender Bender", "Gender Bender"],
          ["Harem", "Harem"],
          ["Historical", "Historical"],
          ["Horror", "Horror"],
          ["Isekai", "Isekai"],
          ["Josei", "Josei"],
          ["Kids", "Kids"],
          ["Magic", "Magic"],
          ["Martial Arts", "Martial Arts"],
          ["Mecha", "Mecha"],
          ["Military", "Military"],
          ["Music", "Music"],
          ["Mystery", "Mystery"],
          ["Parody", "Parody"],
          ["Police", "Police"],
          ["Psychological", "Psychological"],
          ["Romance", "Romance"],
          ["Samurai", "Samurai"],
          ["School", "School"],
          ["Sci-Fi", "Sci-Fi"],
          ["Seinen", "Seinen"],
          ["Shoujo", "Shoujo"],
          ["Shoujo Ai", "Shoujo Ai"],
          ["Shounen", "Shounen"],
          ["Shounen Ai", "Shounen Ai"],
          ["Slice of Life", "Slice of Life"],
          ["Space", "Space"],
          ["Sports", "Sports"],
          ["Super Power", "Super Power"],
          ["Supernatural", "Supernatural"],
          ["Thriller", "Thriller"],
          ["Tragedy", "Tragedy"],
          ["Vampire", "Vampire"],
          ["Yaoi", "Yaoi"],
          ["Yuri", "Yuri"],
        ].map((x) => ({ type_name: "CheckBox", name: x[0], value: x[1] })),
      },
    ];
  }

  getSourcePreferences() {
    return [
      {
        key: "pref_popular_content",
        listPreference: {
          title: "Preferred popular content",
          summary: "",
          valueIndex: 0,
          entries: ["New Mangas", "Recent Chapters"],
          entryValues: ["1", "2"],
        },
      },
      {
        key: "pref_latest_content",
        listPreference: {
          title: "Preferred latest content",
          summary: "",
          valueIndex: 1,
          entries: ["New Mangas", "Recent Chapters"],
          entryValues: ["1", "2"],
        },
      },
      {
        key: "pref_title_lang",
        listPreference: {
          title: "Preferred title language",
          summary: "",
          valueIndex: 0,
          entries: ["Romaji", "English"],
          entryValues: ["1", "2"],
        },
      },
    ];
  }
}
