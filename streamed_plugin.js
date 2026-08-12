// =============================================================================
// NHÓM 1: CẤU HÌNH (Config & Metadata)
// =============================================================================

function getManifest() {
  return JSON.stringify({
    id: "streamed",
    name: "Streamed",
    version: "1.3.9",
    baseUrl: BASE_DOMAIN,
    iconUrl: "https://i.ibb.co/N2mkkD4N/streamed-logo.png",
    isEnabled: true,
    isAdult: false,
    type: "MOVIE",
    layoutType: "HORIZONTAL",
    playerType: "embedtoexoplay",
    debug: true
  });
}

function getHomeSections() {
  return JSON.stringify([
    { slug: "live/popular-viewcount", title: "🔴 LIVE (popular by viewers)", type: "Horizontal", path: "" },
    { slug: "live/popular", title: "🔴 LIVE", type: "Horizontal", path: "" },
    { slug: "fight", title: "Fight (Boxing, MMA, ...v.v) 🥊", type: "Horizontal", path: "" },
    { slug: "football", title: "Football ⚽", type: "Horizontal", path: "" },
    { slug: "motor-sports", title: "Motor Sports 🏁", type: "Horizontal", path: "" },
    { slug: "baseball", title: "Baseball ⚾", type: "Horizontal", path: "" },
    { slug: "basketball", title: "Basketball 🏀", type: "Horizontal", path: "" },
    { slug: "american-football", title: "American Football 🏈", type: "Horizontal", path: "" },
    { slug: "golf", title: "Golf 🚩", type: "Horizontal", path: "" },
    { slug: "tennis", title: "Tennis 🎾", type: "Horizontal", path: "" },
    { slug: "billiards", title: "Billiards 🎱", type: "Horizontal", path: "" },
    { slug: "cricket", title: "Cricket 🏏", type: "Horizontal", path: "" },
    { slug: "afl", title: "AFL 🏈", type: "Horizontal", path: "" },
    { slug: "darts", title: "Darts 🎯", type: "Horizontal", path: "" },
    { slug: "hockey", title: "Hockey 🏒", type: "Horizontal", path: "" },
    { slug: "rugby", title: "Rugby 🏉", type: "Horizontal", path: "" },
    { slug: "other", title: "Other 🏳️‍🌈", type: "Horizontal", path: "" },
    { slug: "all-today", title: "All Matches 📋", type: "Grid", path: "" }
  ]);
}

function getPrimaryCategories() {
  return JSON.stringify([
    { name: "Fight", slug: "fight" },
    { name: "Football", slug: "football" },
    { name: "Basketball", slug: "basketball" },
    { name: "American Football", slug: "american-football" },
    { name: "Motor Sports", slug: "motor-sports" },
    { name: "Tennis", slug: "tennis" },
    { name: "Golf", slug: "golf" },
    { name: "Baseball", slug: "baseball" },
    { name: "Cricket", slug: "cricket" },
    { name: "Billiards", slug: "billiards" },
    { name: "AFL", slug: "afl" },
    { name: "Darts", slug: "darts" },
    { name: "Hockey", slug: "hockey" },
    { name: "Rugby", slug: "rugby" },
    { name: "Other", slug: "other" },
    { name: "All Matches", slug: "all" }
  ]);
}

function getFilterConfig() {
  return JSON.stringify({ sort: [], category: [] });
}

// =============================================================================
// NHÓM 2: SINH URL (App gọi hàm → nhận URL → tự fetch HTTP)
// =============================================================================

function getUrlList(slug, filtersJson) {
  const basePath = "";
  return `${BASE_API_URL}/matches/${slug}`;
}

function getUrlSearch(keyword = "", filtersJson) {
  return `${BASE_API_URL}/matches/all?search=${encodeURIComponent(keyword.trim())}`;
}

function getUrlDetail(path) {
  if (!path) return "";
  if (path.indexOf("http") === 0) return path;
  return BASE_API_URL + path;
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
    let streams = JSON.parse(html);
    const items = [];
    const keyword = extractParamFromUrl(apiUrl, "search");
    streams = filterStreams(streams, keyword);

    streams.forEach((stream) => {
      const title = stream.title?.trim();
      const posterUrl = getPosterUrl(stream);
      const category = stream.category?.toUpperCase();

      for (const item of stream.sources) {
        const serverName = item.source?.toUpperCase();
        //remove server echo
        if (serverName === "ECHO") continue;
        const description = `Event "${title}" is hosted on server ${serverName}.`;
        const encodedData = encodeURIComponent(JSON.stringify({ title, posterUrl, category, description }));

        items.push({
          id: `/stream/${item.source}/${item.id}|data:${encodedData}`,
          title,
          posterUrl,
          backdropUrl: posterUrl,
          quality: Date.now() >= stream.date ? "LIVE" : formatDateTime(stream.date),
          episode_current: serverName,
          lang: category
        });
      }
    });

    return JSON.stringify({
      items: items,
      pagination: { currentPage: 1, totalPages: 1 }
    });
  } catch (error) {
      console.error("⛔ [parseListResponse in streamed_plugin.js] ERROR MESSAGE: ", error);
      return JSON.stringify({
        items: [],
        pagination: { currentPage: 1, totalPages: 1 }
      });
  }
}

function parseSearchResponse(html, apiUrl) {
  return parseListResponse(html, apiUrl);
}

function parseMovieDetail(html, apiUrl) {
  try {
    const stream = JSON.parse(html);

    if (!Array.isArray(stream) || stream.length === 0) return EMPTY_MOVIE_DETAIL;
      
    const data = JSON.parse(decodeURIComponent(getPipeData(apiUrl)));
    const episodes = [];
    const serverName = stream[0].source?.toUpperCase();

    stream.forEach((item, index) => {
      const quality = item.hd ? "HD" : "SD";
      const viewers = formatViewerCount(item.viewers);

      episodes.push({
        id: item.embedUrl,
        name: `${quality}${viewers ? " - 🔴 " + viewers : ""}${item.language ? " - " + item.language : ""}`,
        slug: `${item.id.split("?")[0]}-${index + 1}`
      });
    });

    return JSON.stringify({
      id: getPath(apiUrl, `/stream/`),
      title: data.title,
      posterUrl: data.posterUrl,
      backdropUrl: data.posterUrl,
      lang: serverName,
      description: data.description + SELECTION_GUIDE,
      quality: data.category,
      servers: [{ name: serverName, episodes: episodes }]
    });
  } catch (error) {
      console.error("⛔ [parseMovieDetail in streamed_plugin.js] ERROR MESSAGE: ", error);
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
      console.error("⛔ [parseDetailResponse in streamed_plugin.js] ERROR MESSAGE: ", error);
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

const BACKUP_DOMAINS = "https://strmd.link";
const BASE_DOMAIN = "https://streamed.pk";
const BASE_API_URL = "https://streamed.pk/api";
const FALLBACK_POSTER_URL = "https://i.ibb.co/rKHf363x/fallback-thumbnail.webp";
const EMPTY_MOVIE_DETAIL = JSON.stringify({
  id: "",
  title: "⚠️ Stream Link Not Found!",
  posterUrl: FALLBACK_POSTER_URL,
  backdropUrl: FALLBACK_POSTER_URL,
  servers: []
});
const SELECTION_GUIDE = `\n\n✅The format of each live event link is: [VideoQuality - ConcurrentViewers].\n✅Video quality: Prefer at least HD.\n✅Concurrent viewers: higher is better, 1N = 1000 concurrent viewers.`;

// ======================================
// FUNCTIONS
// ======================================

function getPosterUrl(stream) {
  if (stream?.poster) return BASE_API_URL + stream.poster.substring(stream.poster.indexOf("/api/") + 4);
  const teams = stream.teams;
  
  if(!teams) return FALLBACK_POSTER_URL;
  const homeTeamLogoSlug = teams.home?.badge;
  const awayTeamLogoSlug = teams.away?.badge;

  if (homeTeamLogoSlug && awayTeamLogoSlug) 
    return `${BASE_API_URL}/images/poster/${homeTeamLogoSlug}/${awayTeamLogoSlug}.webp`;
  return FALLBACK_POSTER_URL;
}

function formatDateTime(timestamp) {
  if (timestamp == null) return "";
  if (timestamp < 1e12) {
    timestamp *= 1000;
  }
  const date = new Date(timestamp);
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const MM = String(date.getMonth() + 1).padStart(2, "0");

  return `${hh}:${mm}-${dd}/${MM}`;
}

function formatViewerCount(viewerCount) {
  if (!viewerCount) return 0;
  return /^\d+$/.test(viewerCount)
    ? +viewerCount < 1000
      ? viewerCount
      : String(Math.floor(+viewerCount / 1000)) + "N"
    : viewerCount;
}

function extractParamFromUrl(url, param) {
  if (!url) return "";
  var match = url.match(new RegExp("[?&]" + param + "=([^&]+)"));

  return match ? decodeURIComponent(match[1]) : "";
}

function filterStreams(streams, keyword) {
  if (keyword) {
    streams = streams.filter((stream) => {
      return (
        stream.title?.toLowerCase()?.indexOf(keyword.toLowerCase() || "") >= 0
      );
    });
  }
  return streams;
}

function getPath(apiUrl, keyword) {
  const index = apiUrl.indexOf(keyword);

  if (!keyword || index === -1) return "";
  return apiUrl.substring(index);
}

function getPipeData(apiUrl) {
    if (!apiUrl) return "";
    const index = apiUrl.indexOf("|");

    if (index < 0) return "";
    var res = apiUrl.substring(index + 1).replace(/^\s+/, "");
    // Remove the prefix "data:" if present (case-insensitive)
    if (res.toLowerCase().indexOf("data:") === 0) return res.substring(5);
    
    return res;
}