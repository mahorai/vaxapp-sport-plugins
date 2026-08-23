// =============================================================================
// NHÓM 1: CẤU HÌNH (Config & Metadata)
// =============================================================================

function getManifest() {
  return JSON.stringify({
    id: "streamfree",
    name: "StreamFree",
    version: "1.0.0",
    baseUrl: BASE_DOMAIN,
    iconUrl: "https://i.ibb.co/YBbwG64c/streamfree-logo.png",
    isEnabled: true,
    isAdult: false,
    type: "MOVIE",
    layoutType: "HORIZONTAL",
    playerType: "auto",
    debug: true
  });
}

function getHomeSections() {
  return JSON.stringify([
    { slug: "soccer", title: "Soccer ⚽", type: "Horizontal", path: "" },
    { slug: "combat", title: "Combat 🥊", type: "Horizontal", path: "" },
    { slug: "basketball", title: "Basketball 🏀", type: "Horizontal", path: "" },
    { slug: "hockey", title: "Hockey 🏒", type: "Horizontal", path: "" },
    { slug: "baseball", title: "Baseball ⚾", type: "Horizontal", path: "" },
    { slug: "football", title: "Football 🏈", type: "Horizontal", path: "" },
    { slug: "racing", title: "Racing 🏁", type: "Horizontal", path: "" },
    { slug: "tennis", title: "Tennis 🎾", type: "Horizontal", path: "" },
    { slug: "cricket", title: "Cricket 🏏", type: "Horizontal", path: "" }
  ]);
}

function getPrimaryCategories() {
  return JSON.stringify([
    { name: "Soccer", slug: "soccer" },
    { name: "Combat", slug: "combat" },
    { name: "Basketball", slug: "basketball" },
    { name: "Hockey", slug: "hockey" },
    { name: "Baseball", slug: "baseball" },
    { name: "Football", slug: "football" },
    { name: "Racing", slug: "racing" },
    { name: "Tennis", slug: "tennis" },
    { name: "Cricket", slug: "cricket" }
  ]);
}

function getFilterConfig() {
  return JSON.stringify({ sort: [], category: [] });
}

// =============================================================================
// NHÓM 2: SINH URL (App gọi hàm → nhận URL → tự fetch HTTP)
// =============================================================================

function getUrlList(slug, filtersJson) {
  return `${BASE_DOMAIN}/catalog/tv/streamfree-live.json?category=${encodeURIComponent(slug)}`;
}

function getUrlSearch(keyword = "", filtersJson) {
  keyword = keyword?.trim() || "";
  return `${BASE_DOMAIN}/catalog/tv/streamfree-live.json?search=${encodeURIComponent(keyword.trim())}`;
}

function getUrlDetail(path) {
  if (!path) return "";
  if (path.indexOf("http") === 0) return path;
  return `${BASE_DOMAIN}${path}`;
}

function getUrlCategories() {
  return "";
}
function getUrlCountries() {
  return "";
}
function getUrlYears() {
  return "";
}

// =============================================================================
// NHÓM 3: PARSER (App fetch URL xong → ném HTML/JSON thô vào đây → bạn parse)
// =============================================================================

function parseListResponse(html, apiUrl) {
  try {
    if (Object.keys(eventList).length === 0) parseJSON(html);
    let streams = [];
    const items = [];
    const category = extractParamFromUrl(apiUrl, "category");
    const keyword = extractParamFromUrl(apiUrl, "search");

    if (category) streams = filterStreams(eventList, ["category", category]);
    if (keyword) streams = filterStreams(eventList, ["search", keyword]);

    streams.forEach((stream) => {
      const { title, posterUrl, description, cateInfo, viewers } = stream;
      const encodedData = encodeURIComponent(
        JSON.stringify({
          title,
          posterUrl,
          category: cateInfo,
          description,
          viewers
        })
      );
      items.push({
        id: `/stream/${stream.type}/${stream.slug}.json`,
        datasend: encodedData,
        episode_current: "SPORTS",
        title,
        posterUrl: posterUrl || FALLBACK_POSTER_URL,
        backdropUrl: posterUrl || FALLBACK_POSTER_URL,
        quality: viewers === "LIVE" ? "LIVE" : `Viewers: ${viewers}`,
        lang: `${cateInfo.toUpperCase()} - ${stream.leagueName}`
      });
    });

    return JSON.stringify({
      items: items,
      pagination: { currentPage: 1, totalPages: 1 }
    });
  } catch (error) {
    console.error(
      "⛔ [parseListResponse in streamfree_plugin.js] ERROR MESSAGE: ",
      error
    );
    return JSON.stringify({
      items: [],
      pagination: { currentPage: 1, totalPages: 1 }
    });
  }
}

function parseSearchResponse(html, apiUrl) {
  return parseListResponse(html, apiUrl);
}

function parseMovieDetail(html, apiUrl, datasend) {
  try {
    const streams = JSON.parse(html)?.streams || [];

    if (streams.length === 0) return EMPTY_MOVIE_DETAIL;
    const episodes = [];

    streams.forEach((stream, index) => {
      episodes.push({
        id: stream.url,
        name: `Link ${index} - ${stream.name.split("•")[1].trim()}`,
        slug: stream.url
      });
    });
    const data = JSON.parse(decodeURIComponent(datasend));

    return JSON.stringify({
      id: apiUrl.substring(apiUrl.lastIndexOf("/") + 1, apiUrl.lastIndexOf(".json")),
      title: data.title,
      posterUrl: data.posterUrl || FALLBACK_POSTER_URL,
      backdropUrl: data.posterUrl || FALLBACK_POSTER_URL,
      episode_current:
        data.viewers === "LIVE" ? "LIVE" : `Viewers: ${data.viewers}`,
      description: `Event "${data.description}" is hosted on server StreamFree`,
      lang: data.category,
      servers: [{ name: "ADMIN", episodes: episodes }],
      quality: "SPORT"
    });
  } catch (error) {
    console.error(
      "⛔ [parseMovieDetail in streamfree_plugin.js] ERROR MESSAGE: ",
      error
    );
    return EMPTY_MOVIE_DETAIL;
  }
}

function parseDetailResponse(html, embedUrl) {
  try {
    return JSON.stringify({
      url: embedUrl,
      headers: {
        Referer: embedUrl,
        Origin: embedUrl,
        "User-Agent":
          "Mozilla/5.0 (Linux; Android 10; SM-G975F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
        "Sec-Ch-Ua":
          '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
        "Sec-Ch-Ua-Mobile": "?1",
        "Sec-Ch-Ua-Platform": '"Android"',
        Accept: "*/*",
        "Accept-Language": "vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7",
        "X-Requested-With": "com.android.chrome"
      },
      isEmbed: true
    });
  } catch (error) {
    console.error(
      "⛔ [parseDetailResponse in streamfree_plugin.js] ERROR MESSAGE: ",
      error
    );
    return "{}";
  }
}

function parseCategoriesResponse(html) {
  return "[]";
}
function parseCountriesResponse(html) {
  return "[]";
}
function parseYearsResponse(html) {
  return "[]";
}

// =============================================================================
// NHÓM 4: HELPERS
// =============================================================================

// ======================================
// VARIABLES
// ======================================

const BASE_DOMAIN = "https://sc.k-20.xyz";
const FALLBACK_POSTER_URL = "https://i.ibb.co/rKHf363x/fallback-thumbnail.webp";
const eventList = {};
const EMPTY_MOVIE_DETAIL = JSON.stringify({
  id: "",
  title: "⚠️ Stream Link Not Found!",
  posterUrl: FALLBACK_POSTER_URL,
  backdropUrl: FALLBACK_POSTER_URL,
  servers: []
});

// ======================================
// FUNCTIONS
// ======================================

function parseJSON(html) {
  try {
    const data = JSON.parse(html);
    data.metas.forEach((event) => {
      console.log(event)
      const category = event.genres[2];
      if (!eventList[category]) eventList[category] = [];
      eventList[category].push({
        slug: event.id,
        type: event.type,
        title: event.name,
        posterUrl: event.poster,
        description: event.description,
        leagueName: event.genres[3],
        viewers:
          event.releaseInfo === "LIVE"
            ? "LIVE"
            : event.releaseInfo.substring(2),
        cateInfo: category
      });
    });
  } catch (error) {
    console.error(
      "⛔ [parseJSON in streamfree_plugin.js] ERROR MESSAGE: ",
      error
    );
    return {};
  }
}

function extractParamFromUrl(url, param) {
  if (!url) return "";
  var match = url.match(new RegExp("[?&]" + param + "=([^&]+)"));
  return match ? decodeURIComponent(match[1]) : "";
}

function filterStreams(eventList, [filterKey, filterValue]) {
  let result = [];

  // filter eventList by category
  if (filterValue && filterKey === "category")
    result = eventList[filterValue] || [];
  // filter eventList by search
  if (filterValue && filterKey === "search") {
    Object.keys(eventList).forEach((category) => {
      eventList[category].forEach((stream) => {
        filterValue = filterValue.toLowerCase();
        const streamName = stream.title.toLowerCase();
        const isTrue = streamName.indexOf(filterValue) >= 0;
        if (isTrue) result.push(stream);
      });
    });
  }
  return result;
}
