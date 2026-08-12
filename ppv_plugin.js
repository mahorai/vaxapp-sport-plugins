// =============================================================================
// NHÓM 1: CẤU HÌNH (Config & Metadata)
// =============================================================================

function getManifest() {
  return JSON.stringify({
    id: "ppv",
    name: "PPV",
    version: "1.2.1",
    baseUrl: BASE_DOMAIN,
    iconUrl: "https://i.ibb.co/BHQSwhLX/ppv-logo.png",
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
    { slug: "combat-sports", title: "Combat Sports 🥊", type: "Horizontal", path: "" },
    { slug: "football", title: "Football ⚽", type: "Horizontal", path: "" },
    { slug: "volleyball", title: "Volleyball 🏐", type: "Horizontal", path: "" },
    { slug: "motorsports", title: "Motorsports 🏁", type: "Horizontal", path: "" },
    { slug: "badminton", title: "Badminton 🏸", type: "Horizontal", path: "" },
    { slug: "golf", title: "Golf 🚩", type: "Horizontal", path: "" },
    { slug: "tennis", title: "Tennis 🎾", type: "Horizontal", path: "" },
    { slug: "wrestling", title: "Wrestling 🤼", type: "Horizontal", path: "" },
    { slug: "arm-wrestling", title: "Arm Wrestling 💪", type: "Horizontal", path: "" },
    { slug: "basketball", title: "Basketball 🏀", type: "Horizontal", path: "" },
    { slug: "baseball", title: "Baseball ⚾", type: "Horizontal", path: "" },
    { slug: "hockey", title: "Hockey 🏒", type: "Horizontal", path: "" },
    { slug: "american-football", title: "American Football 🏈", type: "Horizontal", path: "" },
    { slug: "australian-football", title: "Australian Football 🏈", type: "Horizontal", path: "" },
    { slug: "rugby", title: "Rugby 🏉", type: "Horizontal", path: "" },
    { slug: "darts", title: "Darts 🎯", type: "Horizontal", path: "" },
    { slug: "miscellaneous", title: "Miscellaneous 🏳️‍🌈", type: "Horizontal", path: "" },
    { slug: "channels", title: "24/7 Streams 📺", type: "Horizontal", path: "" }
      // ,{ slug: "", title: "", type: "Horizontal", path: "" },
  ]);
}

function getPrimaryCategories() {
  return JSON.stringify([
    { name: "Combat Sports", slug: "combat-sports" },
    { name: "Football", slug: "football" },
    { name: "Volleyball", slug: "volleyball" },
    { name: "Motorsports", slug: "motorsports" },
    { name: "Badminton", slug: "badminton" },
    { name: "Golf", slug: "golf" },
    { name: "Tennis", slug: "tennis" },
    { name: "Wrestling", slug: "wrestling" },
    { name: "Arm Wrestling", slug: "arm-wrestling" },
    { name: "Basketball", slug: "basketball" },
    { name: "Baseball", slug: "baseball" },
    { name: "Hockey", slug: "hockey" },
    { name: "American Football", slug: "american-football" },
    { name: "Australian Football", slug: "australian-football" },
    { name: "Rugby", slug: "rugby" },
    { name: "Darts", slug: "darts" },
    { name: "Miscellaneous", slug: "miscellaneous" },
    { name: "24/7 Streams", slug: "channels" },
    // ,{ name: "", slug: "" },
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
    let streams = data?.streams || [];
    const items = [];
    const category = extractParamFromUrl(apiUrl, "category");
    const keyword = extractParamFromUrl(apiUrl, "search");

    if (category) streams = filterStreams(streams, ["category", category]);
    if (keyword) streams = filterStreams(streams, ["search", keyword]);

    streams.forEach((stream) => {
      items.push({
        id: "?id=" +
          encodeURIComponent(stream.id) +
          "&category=" +
          encodeURIComponent(
            Object.keys(CATEGORY_MAP).find(
              (key) => CATEGORY_MAP[key] === stream.category_name
            )
          ),
        quality: stream.always_live
          ? "LIVE 24/7"
          : Number(stream.starts_at) <= Math.floor(Date.now() / 1000)
            ? "LIVE"
            : formatDateTime(stream.starts_at),
        title: stream.name,
        posterUrl: stream.poster || FALLBACK_POSTER_URL,
        backdropUrl: stream.poster || FALLBACK_POSTER_URL,
        episode_current: "Viewers: " + stream.viewers,
        lang: `${stream.category_name.toUpperCase()} - ${stream.tag} - ${stream.locale.toUpperCase()}`
      });
    });

    return JSON.stringify({
      items: items,
      pagination: { currentPage: 1, totalPages: 1 }
    });
  } catch (error) {
    console.error("⛔ [parseListResponse] ERROR MESSAGE: ", error);
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
    let streams = data.streams || [];
    // filter streams by category
    const episodes = [];
    const category = extractParamFromUrl(apiUrl, "category");
    streams = filterStreams(streams, ["category", category]);
    // get stream by param id
    const streamId = extractParamFromUrl(apiUrl, "id");
    const stream = getStream(streams, streamId);
    const substreams = stream.substreams;

    if (!stream.iframe && (!Array.isArray(substreams) || substreams.length === 0)) return EMPTY_MOVIE_DETAIL;
    episodes.push({
      id: stream.iframe,
      name: `${stream.source_tag} - ${stream.locale.toUpperCase()}`,
      slug: `${stream.uri_name}-1`
    });
    substreams.forEach((item, index) => {
      episodes.push({
        id: item.iframe,
        name: `${item.source_tag} - ${item.locale.toUpperCase()}`,
        slug: `${item.uri_name}-${index + 2}`
      });
    });

    return JSON.stringify({
      id: getQueryString(apiUrl, `?id=`),
      title: stream.name,
      posterUrl: stream.poster || FALLBACK_POSTER_URL,
      backdropUrl: stream.poster || FALLBACK_POSTER_URL,
      episode_current: "Viewers: " + stream.viewers,
      description: `Event "${stream.name}" is hosted on server PPV`,
      lang: stream.locale,
      servers: [{ name: "ADMIN", episodes: episodes }],
      quality: stream.always_live
        ? "LIVE 24/7"
        : Number(stream.starts_at) <= Math.floor(Date.now() / 1000)
          ? "LIVE"
          : formatDateTime(stream.starts_at),
    });
  } catch (error) {
    console.error("⛔ [parseMovieDetail] ERROR MESSAGE: ", error);
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
    console.error("⛔ [parseDetailResponse] ERROR MESSAGE: ", error);
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

const BACKUP_DOMAINS = "https://ppv.domains/";
const BASE_DOMAIN = "https://ppv.st";
const BASE_API_URL = "https://api.ppv.st/api/streams";
const FALLBACK_POSTER_URL = "https://i.ibb.co/rKHf363x/fallback-thumbnail.webp";
const EMPTY_MOVIE_DETAIL = JSON.stringify({
  id: "",
  title: "⚠️ Stream Link Not Found!",
  posterUrl: FALLBACK_POSTER_URL,
  backdropUrl: FALLBACK_POSTER_URL,
  servers: []
});

// Use CATEGORY_MAP switching back and forth between slug and category
const CATEGORY_MAP = {
  "combat-sports": "Combat Sports",
  football: "Football",
  volleyball: "Volleyball",
  motorsports: "Motorsports",
  badminton: "Badminton",
  golf: "Golf",
  tennis: "Tennis",
  wrestling: "Wrestling",
  basketball: "Basketball",
  baseball: "Baseball",
  hockey: "Hockey",
  "american-football": "American Football",
  "australian-football": "Australian Football",
  rugby: "Rugby",
  darts: "Darts",
  miscellaneous: "Miscellaneous",
  channels: "24/7 Streams",
  "arm-wrestling": "Arm Wrestling"
  // ,: ""
};

// ======================================
// FUNCTIONS
// ======================================

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
    return streams?.find((stream) => {
      return "" + stream.id === id;
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
        item.streams.forEach((stream) => {
          const isLive =
            Number(stream.starts_at) <= Math.floor(Date.now() / 1000) &&
            !stream.always_live;
          if (isLive) result.push(stream);
        });
      });

      result.sort((a, b) => parseInt(b.viewers) - parseInt(a.viewers));
      return result;
    }

    // normal
    return (
      streams.find((item) => {
        return item.category === CATEGORY_MAP[filterValue];
      })?.streams || []
    );
  }
  // filter streams by search
  if (filterValue && filterKey === "search") {
    streams.forEach((item) => {
      item.streams.forEach((stream) => {
        filterValue = filterValue.toLowerCase();
        const streamName = stream.name.toLowerCase();
        const isTrue = streamName.indexOf(filterValue) >= 0;
        if (isTrue) result.push(stream);
      });
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
