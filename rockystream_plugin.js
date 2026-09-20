// =============================================================================
// NHÓM 1: CẤU HÌNH (Config & Metadata)
// =============================================================================

function getManifest() {
  return JSON.stringify({
    id: "rockystream",
    name: "[SPORT] RockyStream",
    version: "1.0.1",
    baseUrl: BASE_DOMAIN,
    iconUrl: "https://i.ibb.co/PZFwWKKg/rockystream-logo.jpg",
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
    { slug: "live", title: "🔴 LIVE", type: "Horizontal", path: "" },
    { slug: "football", title: "Football ⚽", type: "Horizontal", path: "" },
    { slug: "fight", title: "Fight 🥊", type: "Horizontal", path: "" },
    { slug: "baseball", title: "Baseball ⚾", type: "Horizontal", path: "" },
    { slug: "basketball", title: "Basketball 🏀", type: "Horizontal", path: "" },
    { slug: "motor", title: "Motor 🏎️", type: "Horizontal", path: "" },
    { slug: "tennis", title: "Tennis 🎾", type: "Horizontal", path: "" },
    { slug: "american-football", title: "American Football 🏈", type: "Horizontal", path: "" },
    { slug: "australian-football", title: "Australian Football 🏈", type: "Horizontal", path: "" },
    { slug: "hockey", title: "Hockey 🏒", type: "Horizontal", path: "" },
    { slug: "other", title: "Other 🎯", type: "Grid", path: "" }
  ]);
}

function getPrimaryCategories() {
  return JSON.stringify([
    { name: "Football", slug: "football" },
    { name: "Fight", slug: "fight" },
    { name: "Baseball", slug: "baseball" },
    { name: "Basketball", slug: "basketball" },
    { name: "Motor", slug: "motor" },
    { name: "Tennis", slug: "tennis" },
    { name: "American Football", slug: "american-football" },
    { name: "Australian Football", slug: "australian-football" },
    { name: "Hockey", slug: "hockey" },
    { name: "Other", slug: "other" }
  ]);
}

function getFilterConfig() {
  return JSON.stringify({ sort: [], category: [] });
}

// =============================================================================
// NHÓM 2: SINH URL (App gọi hàm → nhận URL → tự fetch HTTP)
// =============================================================================

function getUrlList(slug, filtersJson) {
  return `${BASE_API_URL}?category=${encodeURIComponent(slug)}`;
}

function getUrlSearch(keyword = "", filtersJson) {
  keyword = keyword?.trim() || "";
  return `${BASE_API_URL}?search=${encodeURIComponent(keyword.trim())}`;
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
    let streams = data?.matches || [];
    console.log("1: ", streams);
    const items = [];
    const category = extractParamFromUrl(apiUrl, "category");
    const keyword = extractParamFromUrl(apiUrl, "search");

    if (category) streams = filterStreams(streams, ["category", category]);
    if (keyword) streams = filterStreams(streams, ["search", keyword]);
    console.log("2: ", streams);

    streams.forEach((stream) => {
      items.push({
        id: "?id=" + encodeURIComponent(stream.id),
        quality:
          Number(stream.ts_et) <= Math.floor(Date.now() / 1000)
            ? "LIVE"
            : formatDateTime(stream.ts_et),
        title: stream.title,
        posterUrl: FALLBACK_POSTER_URL,
        backdropUrl: FALLBACK_POSTER_URL,
        episode_current: formatName(stream.league),
        lang: `${stream.category.toUpperCase()}`
      });
    });

    return JSON.stringify({
      items: items,
      pagination: { currentPage: 1, totalPages: 1 }
    });
  } catch (error) {
    console.error(
      "⛔ [parseListResponse in rockystream_plugin.js] ERROR MESSAGE: ",
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

function parseMovieDetail(html, apiUrl) {
  try {
    const data = JSON.parse(html);
    let streams = data?.matches || [];
    // filter streams by category
    const episodes = [];
    // get stream by param id
    const streamId = extractParamFromUrl(apiUrl, "id");
    const stream = getStream(streams, streamId);

    if (stream?.streams?.length === 0) return EMPTY_MOVIE_DETAIL;
    stream.streams.forEach((item) => {
      episodes.push({
        id: item.link,
        name: `Channel HD-${item.hd}`,
        slug: item.link
      });
    });

    return JSON.stringify({
      id: getQueryString(apiUrl, `?id=`),
      title: stream.title,
      posterUrl: FALLBACK_POSTER_URL,
      backdropUrl: FALLBACK_POSTER_URL,
      episode_current: formatName(stream.league),
      description: `Event "${stream.title}" is hosted on server RockyStream`,
      lang: stream.category,
      servers: [{ name: "ADMIN", episodes: episodes }],
      quality:
        Number(stream.ts_et) <= Math.floor(Date.now() / 1000)
          ? "LIVE"
          : formatDateTime(stream.ts_et)
    });
  } catch (error) {
    console.error(
      "⛔ [parseMovieDetail in rockystream_plugin.js] ERROR MESSAGE: ",
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
      "⛔ [parseDetailResponse in rockystream_plugin.js] ERROR MESSAGE: ",
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

const BASE_DOMAIN = "https://rockystream.st";
const BASE_API_URL = "https://rockystream.st/api-event.php";
const FALLBACK_POSTER_URL = "https://i.ibb.co/rKHf363x/fallback-thumbnail.webp";
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

function formatName(str) {
  if (!str) return "";
  const words = str.trim().split(/\s+/);

  if (words.length === 1) return words[0].toUpperCase();

  return words
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

function extractParamFromUrl(url, param) {
  if (!url) return "";
  var match = url.match(new RegExp("[?&]" + param + "=([^&]+)"));
  return match ? decodeURIComponent(match[1]) : "";
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

function getStream(streams, id) {
  if (id)
    return streams?.find((item) => {
      return "" + item.id === id;
    });
  return {};
}

function filterStreams(streams, [filterKey, filterValue]) {
  const result = [];

  // filter streams by category
  if (filterValue && filterKey === "category") {
    if (filterValue === "live") {
      // live
      streams.forEach((item) => {
        const isLive = Number(item.ts_et) <= Math.floor(Date.now() / 1000);
        if (isLive) result.push(item);
      });

      return result;
    }

    // normal
    return streams.filter((item) => item.category === filterValue) || [];
  }
  // filter streams by search
  if (filterValue && filterKey === "search") {
    streams.forEach((item) => {
      filterValue = filterValue.toLowerCase();
      const streamName = item.title.toLowerCase();
      const isTrue = streamName.indexOf(filterValue) >= 0;
      if (isTrue) result.push(item);
    });

    return result;
  }
  return streams;
}

function getQueryString(apiUrl, keyword) {
  const index = apiUrl.indexOf(keyword);
  if (!keyword || index === -1) return "";
  return apiUrl.substring(index);
}
