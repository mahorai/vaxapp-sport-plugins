// =============================================================================
// NHÓM 1: CẤU HÌNH (Config & Metadata)
// =============================================================================

function getManifest() {
  return JSON.stringify({
    id: "ththethao",
    name: "THTheThao",
    version: "1.0.0",
    baseUrl: BASE_URL,
    iconUrl: "https://i.ibb.co/cSrQ5y7K/ththethao-logo.png",
    isEnabled: true,
    isAdult: false,
    type: "IPTV",
    layoutType: "HORIZONTAL",
    playerType: "exoplayer",
    debug: true
  });
}

function getHomeSections() {
  return JSON.stringify([
    { slug: "phao-hoa-tv", title: "Pháo Hoa TV", type: "Horizontal", path: "" },
    { slug: "chuoi-chien-tv", title: "Chuối Chiên TV", type: "Horizontal", path: "" },
    { slug: "vua-san-co-tv", title: "Vua Sân Cỏ TV", type: "Horizontal", path: "" },
    { slug: "xoi-lac-z-tv", title: "Xôi Lạc Z TV", type: "Horizontal", path: "" },
    { slug: "cola-tv", title: "Cola TV", type: "Horizontal", path: "" },
    { slug: "nau-xoi-tv", title: "Nấu Xôi TV", type: "Horizontal", path: "" },
    { slug: "gio-vang-tv", title: "Giờ Vàng TV", type: "Horizontal", path: "" },
    { slug: "socolive-tv", title: "Socolive TV", type: "Horizontal", path: "" },
    { slug: "bia-om-tv", title: "Bia Ôm TV", type: "Horizontal", path: "" },
    { slug: "sp-tv-china", title: "SP TV (China)", type: "Horizontal", path: "" },
  ]);
}

function getPrimaryCategories() {
  return JSON.stringify([
    { name: "Pháo Hoa TV", slug: "phao-hoa-tv" },
    { name: "Chuối Chiên TV", slug: "chuoi-chien-tv" },
    { name: "Vua Sân Cỏ TV", slug: "vua-san-co-tv" },
    { name: "Xôi Lạc Z TV", slug: "xoi-lac-z-tv" },
    { name: "Cola TV", slug: "cola-tv" },
    { name: "Nấu Xôi TV", slug: "nau-xoi-tv" },
    { name: "Giờ Vàng TV", slug: "gio-vang-tv" },
    { name: "Socolive TV", slug: "socolive-tv" },
    { name: "Bia Ôm TV", slug: "bia-om-tv" },
    { name: "SP TV (China)", slug: "sp-tv-china" },
  ]);
}

function getFilterConfig() {
  return JSON.stringify({ sort: [], category: [] });
}

// =============================================================================
// NHÓM 2: SINH URL (App gọi hàm → nhận URL → tự fetch HTTP)
// =============================================================================

function getUrlList(slug, filtersJson) {
  return `${BASE_URL}?category=${slug}`;
}

function getUrlSearch(keyword = "", filtersJson) {
  return `${BASE_URL}?search=${encodeURIComponent(keyword?.trim())}`;
}

function getUrlDetail(path) {
  if (!path) return "";
  if (path.indexOf("http") === 0) return path;
  return `${BASE_URL}${path}`;
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
    const items = [];
    let channels = [];

    if (channelList.length === 0) channelList = parseM3U(html);
    const category = extractParamFromUrl(apiUrl, "category");
    const keyword = extractParamFromUrl(apiUrl, "search");

    if (category)
      channels = filterChannels(channelList, ["category", category]);
    else if (keyword)
      channels = filterChannels(channelList, ["search", keyword]);

    channels.forEach((channel) => {
      const matchInfo = parseChannelName(channel.name);
      items.push({
        id: "?channelId=" + channel.channelId,
        title: matchInfo.title ? matchInfo.title : channel.name,
        description: `Channel "${channel.name}" is hosted on server THTheThao.`,
        posterUrl: channel.tvgLogo || FALLBACK_POSTER_URL,
        backdropUrl: channel.tvgLogo || FALLBACK_POSTER_URL,
        quality: isLive(matchInfo.dateTime) ? "LIVE" : matchInfo.dateTime,
        episode_current: channel.url.includes(".m3u8") ? "HSL" : "FLV"
      });
    });

    return JSON.stringify({
      items: items,
      pagination: { currentPage: 1, totalPages: 1 }
    });
  } catch (error) {
    console.error(
      "⛔ [parseDetailResponse in ththethao_plugin.js] ERROR MESSAGE: ",
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

function parseDetailResponse(html, apiUrl) {
  try {
    if (apiUrl.indexOf("|") > 0) apiUrl = apiUrl.split("|")[0];
    const channelId = extractParamFromUrl(apiUrl, "channelId");
    const {
      url,
      name,
      props: {
        "http-user-agent": userAgent,
        "http-referrer": referrer,
        "http-origin": origin
      }
    } = getChannel(channelList, channelId);

    console.log("ℹ️ [parseDetailResponse in ththethao_plugin.js] Name: ", name);
      if (url.includes(".flv")) {
      // FLV (flv)
      console.log(
        `ℹ️ [parseDetailResponse in ththethao_plugin.js] Manifest type DASH (MPD) - No DRM`
      );
      console.log("ℹ️ [parseDetailResponse in ththethao_plugin.js] URL:", url);
      return JSON.stringify({
       isEmbed: false,
        url: url,
        mimeType: "application/x-mpegURL",
        headers: {
          "User-Agent": userAgent || "Dalvik/2.1.0",
          Referer: referrer || url,
          Origin: origin || url
        }
      });
    } else {
      // HLS (m3u8)
      console.log(
        `ℹ️ [parseDetailResponse in ththethao_plugin.js] Manifest type HLS (M3U8)`
      );
      console.log("ℹ️ [parseDetailResponse in ththethao_plugin.js] URL:", url);
      return JSON.stringify({
        isEmbed: false,
        url: url,
        mimeType: "application/x-mpegURL",
        headers: {
          "User-Agent": userAgent || "Dalvik/2.1.0",
          Referer: referrer || url,
          Origin: origin || url
        }
      });
    }
  } catch (error) {
    console.error(
      "⛔ [parseDetailResponse in ththethao_plugin.js] ERROR MESSAGE: ",
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

const BASE_URL = "https://thcoban.github.io/ththethao/ttthethao.m3u";
const FALLBACK_POSTER_URL = "https://i.ibb.co/rKHf363x/fallback-thumbnail.webp";
let channelList = [];
// Use GROUP_MAP to rename and merge the channel into tvg-group.
const GROUP_MAP = {
  "pháo hoa tv": "Pháo Hoa TV",
  "chuối chiên tv": "Chuối Chiên TV",
  "vua sân cỏ tv": "Vua Sân Cỏ TV",
  "xôi lạc z tv": "Xôi Lạc Z TV",
  "cola tv": "Cola TV",
  "nấu xôi tv": "Nấu Xôi TV",
  "giờ vàng tv": "Giờ Vàng TV",
  "socolive tv": "Socolive TV",
  "bia ôm tv": "Bia Ôm TV",
  "sp tv (china)": "SP TV (China)",
};

// Use CATEGORY_MAP to convert the slug to tvg-group.
const CATEGORY_MAP = {
  "phao-hoa-tv": "Pháo Hoa TV",
  "chuoi-chien-tv": "Chuối Chiên TV",
  "vua-san-co-tv": "Vua Sân Cỏ TV",
  "xoi-lac-z-tv": "Xôi Lạc Z TV",
  "cola-tv": "Cola TV",
  "nau-xoi-tv": "Nấu Xôi TV",
  "gio-vang-tv": "Giờ Vàng TV",
  "socolive-tv": "Socolive TV",
  "bia-om-tv": "Bia Ôm TV",
  "sp-tv-china": "SP TV (China)",
};

// ======================================
// FUNCTIONS
// ======================================

function extractParamFromUrl(url, param) {
  if (!url) return "";
  var match = url.match(new RegExp("[?&]" + param + "=([^&]+)"));
  return match ? decodeURIComponent(match[1]) : "";
}

function filterChannels(channels, [filterKey, filterValue]) {
  // filter channels by category
  if (filterValue && filterKey === "category") {
    return channels.filter(
      (channel) => CATEGORY_MAP[filterValue] === channel.tvgGroup
    );
  }
  if (filterValue && filterKey === "search") {
    return channels.filter((channel) => {
      const name = channel.name.toLowerCase();
      filterValue = filterValue.toLowerCase();
      return name.indexOf(filterValue) >= 0;
    });
  }
}

function getChannel(channels, channelId) {
  if (channelId === undefined || channelId === null || channelId === "")
    return {};
  const numId = parseInt(channelId, 10);
  return (
    channels.find(
      (channel) => String(channel.channelId) === String(channelId)
    ) || {}
  );
}

function parseM3U(text) {
  const lines = text.split("\n");
  const channels = [];
  let currentChannel = null;
  let count = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.toUpperCase().includes("EXTINF:")) {
      currentChannel = {
        name: "No Name",
        tvgLogo: "",
        tvgGroup: "No Group",
        url: "",
        tvgId: "",
        channelId: count++,
        props: {}
      };

      const commaIndex = line.lastIndexOf(`,`);
      if (commaIndex !== -1)
        currentChannel.name =
          line.substring(commaIndex + 2).trim() || "No Name";

      const logoMatch = line.match(/tvg-logo="([^"]+)"/i);
      if (logoMatch && logoMatch[1]) currentChannel.tvgLogo = logoMatch[1];

      const groupMatch = line.match(/group-title="([^"]+)"/i);
      if (groupMatch && groupMatch[1])
        currentChannel.tvgGroup = GROUP_MAP[groupMatch[1].toLowerCase()]
          ? GROUP_MAP[groupMatch[1].toLowerCase()]
          : groupMatch[1];

      const idMatch = line.match(/tvg-id="([^"]+)"/i);
      if (idMatch && idMatch[1]) currentChannel.tvgId = idMatch[1];

      // Capture all catchup attributes
      const catchupMatch = line.match(/catchup="([^"]+)"/i);
      if (catchupMatch) currentChannel.props.catchup = catchupMatch[1];

      const catchupDaysMatch = line.match(/catchup-days="([^"]+)"/i);
      if (catchupDaysMatch)
        currentChannel.props.catchupDays = catchupDaysMatch[1];

      const catchupSourceMatch = line.match(/catchup-source="([^"]+)"/i);
      if (catchupSourceMatch)
        currentChannel.props.catchupSource = catchupSourceMatch[1];
    } else if (line.toUpperCase().startsWith("#KODIPROP:")) {
      if (currentChannel) {
        const propLine = line.substring(10).trim();
        const equalIdx = propLine.indexOf("=");
        if (equalIdx !== -1) {
          const key = propLine.substring(0, equalIdx).trim();
          const val = propLine.substring(equalIdx + 1).trim();
          currentChannel.props[key] = val;
        }
      }
    } else if (line.toUpperCase().startsWith("#EXTVLCOPT:")) {
      if (currentChannel) {
        const optLine = line.substring(11).trim();
        const equalIdx = optLine.indexOf("=");
        if (equalIdx !== -1) {
          const key = optLine.substring(0, equalIdx).trim();
          const val = optLine.substring(equalIdx + 1).trim();
          currentChannel.props[key] = val;
        }
      }
    } else if (line !== "" && !line.startsWith("#")) {
      if (currentChannel) {
        currentChannel.url = line;
        channels.push(currentChannel);
        currentChannel = null;
      } else {
        channels.push({
          name: line.split("/").pop().toUpperCase() || "No Name",
          tvgLogo: "",
          tvgGroup: "No Group",
          url: line,
          channelId: count++,
          props: {}
        });
      }
    }
  }
  return channels;
}

// Convert Base64/Base64Url to Hex for ClearKey
function base64ToHex(base64) {
  if (!base64) return "";
  let b64 = base64.replace(/-/g, "+").replace(/_/g, "/");
  while (b64.length % 4 !== 0) b64 += "=";
  try {
    const raw = atob(b64);
    let result = "";
    for (let i = 0; i < raw.length; i++) {
      const hex = raw.charCodeAt(i).toString(16);
      result += hex.length === 2 ? hex : "0" + hex;
    }
    return result.toLowerCase();
  } catch (e) {
    console.error("Lỗi giải mã Base64:", e);
    return "";
  }
}

// A handmade atob function for QuickJS
function atob(input) {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  let str = String(input).replace(/[\t\n\f\r ]/g, "");

  let output = "";
  let buffer = 0;
  let bits = 0;

  for (let i = 0; i < str.length; i++) {
    if (str[i] === "=") break;

    const index = chars.indexOf(str[i]);
    if (index === -1) {
      throw new Error("Invalid base64 character");
    }

    buffer = (buffer << 6) | index;
    bits += 6;

    if (bits >= 8) {
      bits -= 8;
      output += String.fromCharCode((buffer >> bits) & 0xff);
    }
  }

  return output;
}

function parseChannelName(channelName) {
  const match = channelName.trim().match(
    /^(?:🟢\s*)?(\d{2}:\d{2})\s+(\d{2}\/\d{2})\s+(.+)$/
  );
  if (!match) {
    return {
      dateTime: null,
      title: channelName.trim(),
    };
  }
  return {
    dateTime: `${match[1]}-${match[2]}`,
    title: match[3].trim(),
  };
}

function isLive(dateTime) {
  // dateTime format: "22:30-05/08"
  var match = /^(\d{2}):(\d{2})-(\d{2})\/(\d{2})$/.exec(dateTime);

  if (!match) {
    return false;
  }
  var hour = Number(match[1]);
  var minute = Number(match[2]);
  var day = Number(match[3]);
  var month = Number(match[4]);
  var now = new Date();
  var year = now.getUTCFullYear();
  // GMT+7 -> UTC
  var eventTime = Date.UTC(year, month - 1, day, hour - 7, minute);

  return eventTime <= Date.now();
}

function isLive(dateTime) {
  // dateTime format: "22:30-05/08" hoặc "3:30-05/08"
  // Mặc định GMT+7
  var match = /^(\d{1,2}):(\d{2})-(\d{2})\/(\d{2})$/.exec(dateTime);

  if (!match) {
    return false;
  }
  var hour = Number(match[1]);
  var minute = Number(match[2]);
  var day = Number(match[3]);
  var month = Number(match[4]);

  // Validate
  if (
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59 ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31
  ) {
    return false;
  }
  // Lấy năm hiện tại theo UTC
  var now = new Date();
  var year = now.getUTCFullYear();
  // GMT+7 -> UTC
  var eventTimestamp = Date.UTC(year, month - 1, day, hour - 7, minute, 0, 0);

  // So sánh timestamp hiện tại (UTC)
  return eventTimestamp <= Date.now();
}
