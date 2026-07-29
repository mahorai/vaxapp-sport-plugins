const BASE_URL = "https://streamed.pk";
const FALLBACK_POSTER_URL = "https://i.ibb.co/rKHf363x/fallback-thumbnail.webp";
const SELECTION_GUIDE = `\n\n✅The format of each live event link is: [VideoQuality - ConcurrentViewers].\n✅Video quality: Prefer at least HD.\n✅Concurrent viewers: higher is better, 1N = 1000 concurrent viewers.`;

// =============================================================================
// NHÓM 1: CẤU HÌNH (Config & Metadata)
// =============================================================================

function getManifest() {
  return JSON.stringify({
    id: "streamed",
    name: "Streamed",
    version: "1.2.9",
    baseUrl: BASE_URL,
    iconUrl: "https://i.ibb.co/N2mkkD4N/streamed-logo.png",
    isEnabled: true,
    isAdult: false,
    type: "MOVIE",
    layoutType: "HORIZONTAL",
    playerType: "embedtoexoplay"
  });
}

function getHomeSections() {
  return JSON.stringify([
    {
      slug: "live/popular-viewcount",
      title: "🔴 LIVE (popular by viewers)",
      type: "Horizontal",
      path: ""
    },
    {
      slug: "live/popular",
      title: "🔴 LIVE",
      type: "Horizontal",
      path: ""
    },
    {
      slug: "fight",
      title: "Fight (Boxing, UFC, ...) 🥊",
      type: "Horizontal",
      path: ""
    },
    { slug: "football", title: "Football ⚽", type: "Horizontal", path: "" },
    {
      slug: "motor-sports",
      title: "Motor Sports 🏁",
      type: "Horizontal",
      path: ""
    },
    { slug: "billiards", title: "Billiards 🎱", type: "Horizontal", path: "" },
    {
      slug: "basketball",
      title: "Basketball 🏀",
      type: "Horizontal",
      path: ""
    },
    {
      slug: "american-football",
      title: "American Football 🏈",
      type: "Horizontal",
      path: ""
    },
    { slug: "golf", title: "Golf 🚩", type: "Horizontal", path: "" },
    { slug: "tennis", title: "Tennis 🎾", type: "Horizontal", path: "" },
    { slug: "cricket", title: "Cricket 🏏", type: "Horizontal", path: "" },
    { slug: "afl", title: "AFL 🏈", type: "Horizontal", path: "" },
    { slug: "darts", title: "Darts 🎯", type: "Horizontal", path: "" },
    { slug: "hockey", title: "Hockey 🏒", type: "Horizontal", path: "" },
    { slug: "rugby", title: "Rugby 🏉", type: "Horizontal", path: "" },
    { slug: "other", title: "Other 🏳️‍🌈", type: "Horizontal", path: "" },
    {
      slug: "all-today",
      title: "All Matches 📋",
      type: "Grid",
      path: ""
    }
  ]);
}

function getPrimaryCategories() {
  return JSON.stringify([
    { name: "Fight (Boxing, UFC, ...)", slug: "fight" },
    { name: "Football", slug: "football" },
    { name: "Basketball", slug: "basketball" },
    { name: "American Football", slug: "american-football" },
    { name: "Motor Sports", slug: "motor-sports" },
    { name: "Tennis", slug: "tennis" },
    { name: "Golf", slug: "golf" },
    { name: "Billiards", slug: "billiards" },
    { name: "Baseball", slug: "baseball" },
    { name: "Cricket", slug: "cricket" },
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
  return `${BASE_URL}/api/matches/${slug}`;
}

function getUrlSearch(keyword, filtersJson) {
  return `${BASE_URL}/api/matches/all?search=${encodeURIComponent(keyword)}`;
}

function getUrlDetail(path) {
  if (!path) return "";
  if (path.indexOf("http") === 0) return path;
  if (path.charAt(0) !== "/") path = "/" + path;
  return BASE_URL + path;
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
      const title = stream?.title?.trim();
      const posterUrl = getPosterUrl(stream);
      const streamLabel =
        Date.now() >= stream?.date ? "LIVE" : formatDateTime(stream?.date);
      const category = stream?.category?.toUpperCase() || "";

      stream.sources.forEach((item) => {
        const serverName = item?.source?.toUpperCase();
        const description = `Event "${title}" is hosted on server ${serverName}.`;
        const path = `/api/stream/${item?.source}/${item?.id}?posterUrl=${encodeURIComponent(posterUrl)}&title=${encodeURIComponent(title)}&category=${encodeURIComponent(category)}&description=${encodeURIComponent(description)}`;

        items.push({
          id: path,
          title: title,
          description: description,
          posterUrl: posterUrl,
          backdropUrl: posterUrl,
          quality: streamLabel,
          episode_current: serverName,
          lang: category
        });
      });
    });

    return JSON.stringify({
      items: items,
      pagination: { currentPage: 1, totalPages: 1 }
    });
  } catch (e) {
    console.log(e);
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
  const streams = JSON.parse(html);

  if (!Array.isArray(streams) || streams.length === 0)
    return JSON.stringify({
      id: "",
      title: "⚠️ Stream Link Not Found!",
      posterUrl: FALLBACK_POSTER_URL,
      backdropUrl: FALLBACK_POSTER_URL,
      servers: []
    });

  const id = getSlug(apiUrl, `/api/`);
  const posterUrl = extractParamFromUrl(apiUrl, "posterUrl");
  const title = extractParamFromUrl(apiUrl, "title");
  const category = extractParamFromUrl(apiUrl, "category");
  const description =
    extractParamFromUrl(apiUrl, "description") + SELECTION_GUIDE;
  const episodes = [];
  const serverName = streams[0].source?.toUpperCase();

  streams.forEach((stream, index) => {
    const embedUrl = stream?.embedUrl;
    const quality = stream?.hd ? "HD" : "SD";
    const viewers = formatViewerCount(stream?.viewers);
    const language = stream.language;
    const name = `${quality}${viewers ? " - " + viewers + "👁️" : ""}${language ? " - " + language : ""}`;
    const slug = `${id}/${index + 1}`;

    episodes.push({
      id: embedUrl,
      name: name,
      slug: slug
    });
  });

  const servers = [{ name: serverName, episodes: episodes }];

  return JSON.stringify({
    id: id,
    title: title,
    posterUrl: posterUrl,
    backdropUrl: posterUrl,
    lang: serverName,
    description: description,
    quality: category,
    servers: servers
  });
}

function parseDetailResponse(html, sourceUrl) {
  return JSON.stringify({
    url: sourceUrl,
    headers: {
      Referer: sourceUrl,
      Origin: sourceUrl,
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
}

function parseEmbedResponse(html, sourceUrl) {
  return JSON.stringify({ url: "", isEmbed: false });
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

function getPosterUrl(item) {
  try {
    if (item?.poster) return BASE_URL + item.poster;
    const homeTeamLogoSlug = item?.teams?.home?.badge;
    const awayTeamLogoSlug = item?.teams?.away?.badge;
    if (homeTeamLogoSlug && awayTeamLogoSlug)
      return (
        BASE_URL +
        `/api/images/poster/${homeTeamLogoSlug}/${awayTeamLogoSlug}.webp`
      );
    return FALLBACK_POSTER_URL;
  } catch (e) {
    return "";
  }
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
        stream?.title?.toLowerCase()?.indexOf(keyword.toLowerCase() || "") >= 0
      );
    });
  }
  return streams;
}

function getSlug(apiUrl, keyword) {
  const index = apiUrl.indexOf(keyword);
  if (!keyword || index === -1) return "";
  return apiUrl.substring(index);
}
