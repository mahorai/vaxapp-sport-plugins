// =============================================================================
// NHÓM 1: CẤU HÌNH (Config & Metadata)
// =============================================================================

function getManifest() {
  return JSON.stringify({
    id: "timstreams",
    name: "Timstreams",
    version: "1.2.4",
    baseUrl: "https://timstreams.st",
    iconUrl: "https://i.ibb.co/WN9gstLN/logo.png",
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
    { slug: "live-upcoming", title: "🔴 LIVE EVENTS", type: "Horizontal", path: "" },
    { slug: "replays", title: "Latest Replays 🎞️", type: "Horizontal", path: "" },
    { slug: "channels", title: "Television 24/7 📺", type: "Grid", path: "" }
  ]);
}

function getPrimaryCategories() {
  return JSON.stringify([
    { name: "LIVE EVENTS", slug: "live-upcoming" },
    { name: "Latest Replays", slug: "replays" },
    { name: "Television 24/7", slug: "channels" }
  ]);
}

function getFilterConfig() {
  return JSON.stringify({ sort: [], category: [] });
}

// =============================================================================
// NHÓM 2: SINH URL (App gọi hàm → nhận URL → tự fetch HTTP)
// =============================================================================

function getUrlList(slug, filtersJson) {
  return `${BASE_API_URL}/${slug}`;
}

function getUrlSearch(keyword = "", filtersJson) {
  return `${BASE_API_URL}/channels?search=${encodeURIComponent(keyword.trim())}`;
}

function getUrlDetail(path) {
  if (!path) return "";
  if (path.indexOf("http") === 0) return path;
  return `${BASE_API_URL}${path}`;
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
    const data = JSON.parse(html);
    let streams = data?.events || data?.channels || data?.replays;
    // API return events|channels|replays = null instead of []
    if(!streams) return EMPTY_LIST_RESPONSE;
    const items = [];
    // Filter search keyword form query string ?search= 
    const keyword = extractParamFromUrl(apiUrl, "search");

    streams = filterStreams(streams, keyword);
    streams.forEach((stream) => {
      items.push({
        id: (data.events ? "/live-upcoming" : data.channels ? "/channels" : "/replays") + `?slug=${stream.url}`,
        title: stream.name,
        description: `Event "${stream.name}" is hosted on server Timstreams.`,
        posterUrl: stream.logo || FALLBACK_POSTER_URL,
        backdropUrl: stream.logo || FALLBACK_POSTER_URL,
        quality: data.channels ? "LIVE 24/7" : data.replays ? "📀" : isLive(stream.time) ? "LIVE" : formatDateTimeGMT7(stream.time),
        episode_current: data.genres?.[stream.genre]?.name ? `Viewers: ${stream.viewers}` : "REPLAY",
        lang: data.genres?.[stream.genre]?.name?.toUpperCase() || ""
      });
    });
    
    return JSON.stringify({
      items: items,
      pagination: { currentPage: 1, totalPages: 1 }
    });
  } catch (error) {
    console.error("⛔ [parseListResponse in timstreams_plugin.js] ERROR MESSAGE: ", error);
    return EMPTY_LIST_RESPONSE;
  }
}

function parseSearchResponse(html, apiUrl) {
  return parseListResponse(html, apiUrl);
}

function parseMovieDetail(html, apiUrl) {
  try {
    const data = JSON.parse(html);
    const streams = data?.events || data?.replays || data?.channels;

    if(!streams) return EMPTY_MOVIE_DETAIL;
    const slug = extractParamFromUrl(apiUrl, "slug");
    const stream = getStream(streams, slug);

    if(!stream) return EMPTY_MOVIE_DETAIL;
    const episodes = [];

    stream.streams?.forEach((item, index) => {
      episodes.push({
        id: item.url,
        name: data.events || data.replays ? item.name : `${stream.name} - ${item.name}`,
        slug: `${stream.url}-${index + 1}`
      });
    });

    return JSON.stringify({
      id: getPath(apiUrl, `/live-upcoming`) || getPath(apiUrl, `/channels`) || getPath(apiUrl, `/replays`),
      title: stream.name,
      posterUrl: stream.logo || FALLBACK_POSTER_URL,
      backdropUrl: stream.logo || FALLBACK_POSTER_URL,
      quality: (stream.genre && data.genres && data.genres?.[stream.genre]?.name) || `REPLAY - ${stream.date}`,
      episode_current: (data.events && isLive(stream.time) ? "LIVE" : formatDateTimeGMT7(stream.time)) || `Viewers: ${stream.viewers}`,
      description: `Event "${stream.name}" is hosted on server Timstreams`,
      servers: [{ name: "ADMIN", episodes: episodes }]
    });
  } catch (error) {
    console.error("⛔ [parseMovieDetail in timstreams_plugin.js] ERROR MESSAGE: ", error);
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
    console.error("⛔ [parseDetailResponse in timstreams_plugin.js] ERROR MESSAGE: ", error);
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

const BASE_DOMAIN = "https://timstreams.st";
const BASE_API_URL = "https://api.timstreams.st/api";
const FALLBACK_POSTER_URL = "https://i.ibb.co/rKHf363x/fallback-thumbnail.webp";
const EMPTY_MOVIE_DETAIL = JSON.stringify({
  id: "",
  title: "⚠️ Stream Link Not Found!",
  posterUrl: FALLBACK_POSTER_URL,
  backdropUrl: FALLBACK_POSTER_URL,
  servers: []
});
const EMPTY_LIST_RESPONSE = JSON.stringify({
  items: [],
  pagination: { currentPage: 1, totalPages: 1 },
});


// ======================================
// FUNCTIONS
// ======================================

// GMT-4
const isLive = (time) => Date.now() >= new Date(time + ":00-04:00").getTime();

function formatDateTimeGMT7(timestamp) {
  if (!timestamp) return "";
  if (!timestamp.includes(":")) return timestamp;

  const [datePart, timePart] = timestamp.split("T");
  const [year, month, day] = datePart.split("-").map(Number);
  const [hour, minute] = timePart.split(":").map(Number);
  const d = new Date(Date.UTC(year, month - 1, day, hour + 11, minute));

  return (
    `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}-` +
    `${String(d.getUTCDate()).padStart(2, "0")}/${String(d.getUTCMonth() + 1).padStart(2, "0")}`
  );
}

function extractParamFromUrl(url, param) {
  if (!url) return "";
  var match = url.match(new RegExp("[?&]" + param + "=([^&]+)"));
  return match ? decodeURIComponent(match[1]) : "";
}

function getStream(streams, slug) {
  return streams.find((stream) => stream?.url === slug);
}

function filterStreams(streams, keyword) {
  // search
  if (keyword) {
    streams = streams.filter(function (stream) {
      return stream.name?.toLowerCase()?.indexOf(keyword.toLowerCase()) >= 0;
    });
  }

  return streams;
}

function getPath(apiUrl, keyword) {
  const index = apiUrl.indexOf(keyword);
  if (!keyword || index === -1) return "";
  return apiUrl.substring(index);
}
