// Entry point. Installs the globals the Flutter web shell expects
// (flutter/lib/web/common.dart evaluates isMobile()/getByName at import time,
// web_model.dart calls init() and waits for onInitFinished()).
import { getByName, refreshCodecProbe, setByName } from "./bridge";
import { initCrypto } from "./crypto";
import { PeerStore, applyRuntimeConfig } from "./config";
import { log } from "./log";
import { VERSION } from "./version";
import { sessions } from "./sessions";
import { WebRtcStream, buildIceServers, fingerprintFromSdp } from "./transport/webrtc";

interface Globals {
  init?: () => void;
  isMobile?: () => boolean;
  setByName?: (name: string, arg?: unknown) => unknown;
  getByName?: (name: string, arg?: unknown) => string;
  onInitFinished?: () => void;
  rdCore?: { version: string; ready: boolean; webrtc?: unknown };
  rustdeskLocalFonts?: boolean;
}

const g = globalThis as unknown as Globals;

// Capture the shell's callback assignments before Flutter boots.
sessions.installHooks();

// lib/web/terminal_font.dart: load Roboto Mono for the terminal from
// fonts/RobotoMono-Regular.ttf (shipped by the release build) instead of
// letting google_fonts fetch it from fonts.gstatic.com.
g.rustdeskLocalFonts = true;


let ready = false;
const pending: Array<[string, unknown]> = [];

g.isMobile = () =>
  /android|iphone|ipad|ipod|mobile|blackberry|iemobile|opera mini/i.test(navigator.userAgent) ||
  (navigator.maxTouchPoints > 1 && /Macintosh/.test(navigator.userAgent) && !/Windows/.test(navigator.userAgent) && false);

g.setByName = (name: string, arg?: unknown) => {
  if (!ready) {
    // Config writes are safe before init; session calls wait for sodium.
    if (name.startsWith("option") || name === "envvar") return setByName(name, arg);
    pending.push([name, arg]);
    return "";
  }
  return setByName(name, arg);
};

g.getByName = (name: string, arg?: unknown) => getByName(name, arg ?? "");

// WorkDesk: the console opens /web/?peer=<ID>&name=<computer>. The device is
// put at the top of the recent list so the user connects with one click and
// still types the device password. Only a numeric ID and a display name are
// accepted; nothing else (server, key) can be set from the URL.
function addPeerFromUrl(): void {
  try {
    const q = new URLSearchParams(globalThis.location?.search ?? "");
    const id = (q.get("peer") ?? "").replace(/\s/g, "");
    if (!/^\d{6,12}$/.test(id)) return;
    const name = (q.get("name") ?? "").replace(/[\u0000-\u001f<>]/g, "").slice(0, 64);
    const store = new PeerStore(id);
    const old = store.info();
    store.setInfo({
      id, username: old?.username ?? "", hostname: old?.hostname || name, platform: old?.platform ?? "",
      alias: old?.alias || name, tags: old?.tags ?? [], lastConnected: Date.now(),
    });
    globalThis.history?.replaceState(null, "", globalThis.location.pathname);
    log.info(`peer ${id} added from the console link`);
  } catch (e) {
    log.warn("peer link ignored", e);
  }
}

g.init = () => {
  void (async () => {
    try {
      applyRuntimeConfig();
      addPeerFromUrl();
      await initCrypto();
      await refreshCodecProbe();
      ready = true;
      g.rdCore = { version: VERSION, ready: true, webrtc: { WebRtcStream, buildIceServers, fingerprintFromSdp } };
      for (const [n, a] of pending.splice(0)) setByName(n, a);
      log.info(`rustdesk web core ${VERSION} ready`);
    } catch (e) {
      log.error("init failed", e);
    } finally {
      try {
        g.onInitFinished?.();
      } catch (e) {
        log.error("onInitFinished threw", e);
      }
    }
  })();
};

// web_model.dart setFullscreenCallback: Dart installs window.onFullscreenChanged(bool)
// and keeps its toolbar/tab-bar state in sync with the browser.
globalThis.document?.addEventListener("fullscreenchange", () => {
  const fn = (globalThis as unknown as { onFullscreenChanged?: (v: boolean) => void }).onFullscreenChanged;
  if (typeof fn === "function") {
    try {
      fn(!!document.fullscreenElement);
    } catch (e) {
      log.error("onFullscreenChanged threw", e);
    }
  }
});

g.rdCore = { version: VERSION, ready: false, webrtc: { WebRtcStream, buildIceServers, fingerprintFromSdp } };
