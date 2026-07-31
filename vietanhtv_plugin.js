const BASE_URL = "https://tv.vietanhtv.top/tv";
const FALLBACK_POSTER_URL = "https://i.ibb.co/rKHf363x/fallback-thumbnail.webp";
let channelList = [];

// Use GROUP_MAP to rename and merge the channel into tvg-group.
const GROUP_MAP = {
  VTV: "VTV ⭐",
  VTVcab: "VTVcab 💎",
  "In The Box": "QUỐC TẾ 🌍",
  "Quốc Tế": "QUỐC TẾ 🌍",
  HTV: "HTV x HTVC 🧬",
  SCTV: "SCTV 🎫",
  "Địa Phương": "ĐỊA PHƯƠNG 📺",
  "Dự phòng": "BACKUP 📌",
  "Sự Kiện TV360": "TV360 📡",
  "Rạp Phim": "TV360 📡",
  "Sự Kiện VTVPrime": "VTVPrime 🛰️"
};

// Use CATEGORY_MAP to convert the slug to tvg-group.
const CATEGORY_MAP = {
  vtv: "VTV ⭐",
  vtvcab: "VTVcab 💎",
  tv360: "TV360 📡",
  vtvprime: "VTVPrime 🛰️",
  international: "QUỐC TẾ 🌍",
  htv: "HTV x HTVC 🧬",
  sctv: "SCTV 🎫",
  local: "ĐỊA PHƯƠNG 📺",
  backup: "BACKUP 📌"
};

// =============================================================================
// NHÓM 1: CẤU HÌNH (Config & Metadata)
// =============================================================================

function getManifest() {
  return JSON.stringify({
    id: "vietanhtv",
    name: "VietAnhTV",
    version: "1.0.0",
    baseUrl: "https://tv.vietanhtv.top/tv",
    iconUrl: "https://i.ibb.co/b8dVqVt/vietanhtv-logo.jpg",
    isEnabled: true,
    isAdult: false,
    type: "IPTV",
    layoutType: "HORIZONTAL",
    playerType: "exoplayer"
  });
}

function getHomeSections() {
  return JSON.stringify([
    { slug: "vtv", title: "VTV ⭐", type: "Horizontal", path: "" },
    { slug: "vtvcab", title: "VTVcab 💎", type: "Horizontal", path: "" },
    { slug: "tv360", title: "TV360 📡", type: "Horizontal", path: "" },
    { slug: "vtvprime", title: "VTVPrime 🛰️", type: "Horizontal", path: "" },
    {
      slug: "international",
      title: "QUỐC TẾ 🌍",
      type: "Horizontal",
      path: ""
    },
    { slug: "htv-htvc", title: "HTV x HTVC 🧬", type: "Horizontal", path: "" },
    { slug: "sctv", title: "SCTV 🎫", type: "Horizontal", path: "" },
    { slug: "local", title: "ĐỊA PHƯƠNG 📺", type: "Horizontal", path: "" },
    { slug: "backup", title: "BACKUP 📌", type: "Horizontal", path: "" }
  ]);
}

function getPrimaryCategories() {
  return JSON.stringify([
    { name: "VTV ⭐", slug: "vtv" },
    { name: "VTVcab 💎", slug: "vtvcab" },
    { name: "TV360 📡", slug: "tv360" },
    { name: "VTVPrime 🛰️", slug: "vtvprime" },
    { name: "QUỐC TẾ 🌍", slug: "international" },
    { name: "HTV x HTVC 🧬", slug: "htv-htvc" },
    { name: "SCTV 🎫", slug: "sctv" },
    { name: "ĐỊA PHƯƠNG 📺", slug: "local" },
    { name: "BACKUP 📌", slug: "backup" }
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

function getUrlSearch(keyword, filtersJson) {
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
    if (keyword) channels = filterChannels(channelList, ["search", keyword]);

    channels.forEach((channel) => {
      const {
        name,
        tvgLogo,
        tvgGroup,
        channelId,
        props: {
          "inputstream.adaptive.manifest_type": manifestType,
          "inputstream.adaptive.license_type": licenseType,
          "inputstream.adaptive.license_key": licenseKey
        }
      } = channel;

      const description = `Channel "${name}" is hosted on server VIETANHTV.`;
      const tRInfo = manifestType
        ? `${licenseType.toUpperCase()} - DASH`
        : "HSL";
      const tLInfo = "LIVE 24/7";
      const path = licenseKey
        ? licenseKey +
          "&channelId=" +
          channelId +
          "|User-Agent=Dalvik/2.1.0&Referer=https://tv.vietanhtv.top/"
        : "?channelId=" + channelId;

      items.push({
        id: path,
        title: name,
        description: description,
        posterUrl: tvgLogo || FALLBACK_POSTER_URL,
        backdropUrl: tvgLogo || FALLBACK_POSTER_URL,
        quality: tLInfo,
        episode_current: tRInfo
      });
    });

    return JSON.stringify({
      items: items,
      pagination: { currentPage: 1, totalPages: 1 }
    });
  } catch (e) {
    console.log("Error message [parseListResponse]: ", e);
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
  if (apiUrl.indexOf("|") > 0) apiUrl = apiUrl.split("|")[0];
  const channelId = extractParamFromUrl(apiUrl, "channelId");
  const {
    url,
    name,
    props: {
      "http-user-agent": userAgent,
      "http-referrer": referrer,
      "http-origin": origin,
      "inputstream.adaptive.manifest_type": manifestType,
      "inputstream.adaptive.license_type": licenseType,
      "inputstream.adaptive.license_key": licenseKey
    }
  } = getChannel(channelList, channelId);

  // Handle license_type and
  // Value manifest_type = dash or mdp
  // Value license_type = clearkey
  if (licenseType === "clearkey") {
    const clearKey = {};
    try {
      // JSON format {"keys":[{"kid":"...","k":"..."}]}
      const keyData = JSON.parse(html);
      if (keyData.keys && Array.isArray(keyData.keys)) {
        keyData.keys.forEach((k) => {
          clearKey.drmKid = base64ToHex(k.kid);
          clearKey.drmKey = base64ToHex(k.k);
        });
        // JSON format {"kid":"...","k":"..."}
      } else if (keyData.kid && keyData.k) {
        clearKey.drmKid = base64ToHex(keyData.kid);
        clearKey.drmKey = base64ToHex(keyData.k);
      }
    } catch (e) {
      console.log("Error message [parseDetailResponse]: ", e);
      // Hex format "KID:KEY" (e.g. license_key=aabb...:ccdd...)
      if (licenseKey && licenseKey.includes(":")) {
        const parts = licenseKey.split(":");
        if (
          parts.length === 2 &&
          /^[0-9a-fA-F]+$/.test(parts[0]) &&
          /^[0-9a-fA-F]+$/.test(parts[1])
        ) {
          clearKey.drmKid = parts[0].toLowerCase();
          clearKey.drmKey = parts[1].toLowerCase();
        }
      }
    }
    console.log("Name: ", name);
    console.log("ClearKey:", clearKey);
    console.log("URL:", url);
    return JSON.stringify({
      isEmbed: false,
      url: url,
      mimeType: "application/dash+xml",
      drmType: "clearkey",
      drmKid: clearKey.drmKid,
      drmKey: clearKey.drmKey,
      headers: {
        "User-Agent": userAgent || "Dalvik/2.1.0",
        Referer: referrer || url,
        Origin: origin || url
      }
    });
  }
  // Value manifest_type = dash or mdp
  // Value license_type = widevine
  else if (licenseType === "widevine") {
    console.log("Name: ", name);
    console.log("Widevine:", apiUrl);
    console.log("URL:", url);
    return JSON.stringify({
      isEmbed: false,
      url: url,
      mimeType: "application/dash+xml",
      drmType: "widevine",
      licenseUrl: apiUrl,
      headers: {
        "User-Agent": userAgent || "Dalvik/2.1.0",
        Referer: referrer || url,
        Origin: origin || url
      }
    });
  }
  // No manifest_type and licenseType,
  // Normal HSL (m3u8)
  else {
    console.log("Name: ", name);
    console.log("URL:", url);
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

function extractParamFromUrl(url, param) {
  if (!url) return "";
  var match = url.match(new RegExp("[?&]" + param + "=([^&]+)"));
  return match ? decodeURIComponent(match[1]) : "";
}

function filterChannels(channels, [filterKey, filterValue]) {
  const result = [];

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

  return channels;
}

function getChannel(channels, channelId) {
  if (channelId) return channels[channelId];
  return {};
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

      const commaIndex = line.lastIndexOf(",");
      if (commaIndex !== -1)
        currentChannel.name =
          line.substring(commaIndex + 1).trim() || "No Name";

      const logoMatch = line.match(/tvg-logo="([^"]+)"/i);
      if (logoMatch && logoMatch[1]) currentChannel.tvgLogo = logoMatch[1];

      const groupMatch = line.match(/group-title="([^"]+)"/i);
      if (groupMatch && groupMatch[1])
        currentChannel.tvgGroup = GROUP_MAP[groupMatch[1]]
          ? GROUP_MAP[groupMatch[1]]
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
