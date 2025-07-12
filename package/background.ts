// Use importScripts for compatibility
// @ts-ignore
declare function importScripts(...urls: string[]): void;
importScripts("../supabase-bundle.js");
importScripts("./supabase-client.js");

let isCreatingMenus = false;

// Helper to check if localhost:3000 is live
async function isDevServerLive(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1000);
    const res = await fetch("http://localhost:3000/", {
      signal: controller.signal,
    });
    clearTimeout(timeout);
    return res.ok;
  } catch {
    return false;
  }
}

async function createContextMenus(isLoggedIn: boolean) {
  if (isCreatingMenus) return;
  isCreatingMenus = true;
  chrome.contextMenus.removeAll(async () => {
    if (!isLoggedIn) {
      chrome.contextMenus.create({
        id: "loginToUnigraph",
        title: "Log in to Unigraph",
        contexts: ["all"],
      });
      chrome.contextMenus.create({
        id: "showUnigraphPanel",
        title: "Open App",
        contexts: ["all"],
      });
      // Add Dev App menu if localhost:3000 is live
      if (await isDevServerLive()) {
        chrome.contextMenus.create({
          id: "openDevApp",
          title: "Open Dev App",
          contexts: ["all"],
        });
      }
      console.log("[Unigraph] Created logged-out context menu");
      isCreatingMenus = false;
    } else {
      chrome.storage.local.get(["user_info"], async (data: any) => {
        const user = data.user_info || {};
        const userName =
          user.name || user.full_name || user.email || "Unknown User";
        chrome.contextMenus.create({
          id: "unigraphUserInfo",
          title: userName,
          contexts: ["all"],
          enabled: true,
        });
        chrome.contextMenus.create({
          id: "logoutOfUnigraph",
          title: "Log out",
          contexts: ["all"],
          parentId: "unigraphUserInfo",
        });
        chrome.contextMenus.create({
          id: "savePageToUnigraph",
          title: "Save webpage",
          contexts: ["page"],
        });
        chrome.contextMenus.create({
          id: "createAnnotation",
          title: "Create Annotation",
          contexts: ["selection", "image"],
        });
        chrome.contextMenus.create({
          id: "separator1",
          type: "separator",
          contexts: ["all"],
        });
        chrome.contextMenus.create({
          id: "savePageAsScreenshot",
          title: "Save screenshot",
          contexts: ["page", "image"],
        });
        chrome.contextMenus.create({
          id: "saveAreaAsImage",
          title: "Save area as image",
          contexts: ["page"],
        });
        chrome.contextMenus.create({
          id: "savePdfToUnigraph",
          title: "Save PDF",
          contexts: ["link", "page", "all"],
        });
        chrome.contextMenus.create({
          id: "separator2",
          type: "separator",
          contexts: ["all"],
        });
        chrome.contextMenus.create({
          id: "two",
          title: "Send SVG",
          contexts: ["link", "image", "page"],
          documentUrlPatterns: ["*://*/*.svg"],
        });
        chrome.contextMenus.create({
          id: "showUnigraphPanel",
          title: "Open App",
          contexts: ["all"],
        });
        // Add Dev App menu if localhost:3000 is live
        if (await isDevServerLive()) {
          chrome.contextMenus.create({
            id: "openDevApp",
            title: "Open Dev App",
            contexts: ["all"],
          });
        }
        console.log(
          "[Unigraph] Created full context menu with user info and logout"
        );
        isCreatingMenus = false;
      });
    }
  });
}

// Helper function to validate session and show login prompt if needed
async function validateSessionBeforeAction(): Promise<boolean> {
  const isLoggedIn = await isUserLoggedIn();
  if (!isLoggedIn) {
    chrome.notifications?.create({
      type: "basic",
      iconUrl: "icons/icon16.PNG",
      title: "Unigraph",
      message:
        "Please log in to use this feature. Right-click and select 'Log in to Unigraph'.",
    });
    return false;
  }
  return true;
}

async function isUserLoggedIn(): Promise<boolean> {
  return new Promise(async (resolve) => {
    try {
      chrome.storage.local.get(["supabase_session"], async (data: any) => {
        const session = data.supabase_session;
        console.log(
          "[Unigraph] Checking login status - session exists:",
          !!session
        );

        if (!session || !session.access_token) {
          console.log("[Unigraph] No session or access token found");
          resolve(false);
          return;
        }

        // Check if token is expired
        const now = Math.floor(Date.now() / 1000);
        if (session.expires_at && now > session.expires_at) {
          console.log("[Unigraph] Session expired, clearing storage");
          chrome.storage.local.remove(["supabase_session", "user_info"]);
          resolve(false);
          return;
        }

        // Try to validate the session with Supabase
        try {
          // @ts-ignore
          if (typeof (self as any).validateSession === "function") {
            const isValid = await (self as any).validateSession(session);
            if (!isValid) {
              console.log(
                "[Unigraph] Session validation failed, clearing storage"
              );
              chrome.storage.local.remove(["supabase_session", "user_info"]);
              resolve(false);
              return;
            }
          }
        } catch (error) {
          console.log("[Unigraph] Session validation error:", error);
          // If validation fails, assume session is invalid
          chrome.storage.local.remove(["supabase_session", "user_info"]);
          resolve(false);
          return;
        }

        resolve(true);
      });
    } catch (error) {
      console.error("[Unigraph] Error checking login status:", error);
      resolve(false);
    }
  });
}

// Initial context menu creation
isUserLoggedIn().then(createContextMenus);

// Periodic session check and context menu refresh (every 2 minutes)
setInterval(async () => {
  const isLoggedIn = await isUserLoggedIn();
  console.log("[Unigraph] Periodic session check - logged in:", isLoggedIn);
  createContextMenus(isLoggedIn);
}, 2 * 60 * 1000); // 2 minutes

// More frequent context menu refresh for better responsiveness (every 60 seconds)
setInterval(async () => {
  const isLoggedIn = await isUserLoggedIn();
  createContextMenus(isLoggedIn);
}, 60 * 1000); // 60 seconds

// Listen for storage changes to immediately refresh context menu
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (
    namespace === "local" &&
    (changes.supabase_session || changes.user_info)
  ) {
    console.log("[Unigraph] Session storage changed, refreshing context menu");
    // Add a small delay to ensure storage operation completes
    setTimeout(() => {
      isUserLoggedIn().then(createContextMenus);
    }, 100);
  }
});

chrome.runtime.onStartup.addListener(() => {
  isUserLoggedIn().then(createContextMenus);
});
chrome.runtime.onInstalled.addListener(() => {
  isUserLoggedIn().then(createContextMenus);
});

// Listen for resize requests from annotation popup and area capture requests
chrome.runtime.onMessage.addListener(
  (message: any, sender: any, sendResponse: any) => {
    console.log("[Unigraph] Background received message:", message);

    if (
      message &&
      message.type === "resizeAnnotationWindow" &&
      typeof message.height === "number"
    ) {
      chrome.windows.getCurrent((win) => {
        if (win && win.type === "popup") {
          const minHeight = 320,
            maxHeight = 600;
          const minWidth = 360,
            maxWidth = 900;
          const height = Math.max(
            minHeight,
            Math.min(maxHeight, message.height)
          );
          // Maintain 4:3 aspect ratio
          let width = Math.round((height * 4) / 3);
          width = Math.max(minWidth, Math.min(maxWidth, width));
          chrome.windows.update(win.id!, { height, width });
        }
      });
    }

    // Handle area capture request from content script
    if (message && message.type === "unigraph_area_capture" && sender.tab) {
      console.log("[Unigraph] Area capture request received:", message);
      console.log("[Unigraph] Sender tab:", sender.tab);

      const { rect, devicePixelRatio, pageUrl, title, scrollX, scrollY } =
        message;

      // Add a small delay to ensure overlay is removed before capturing screenshot
      setTimeout(() => {
        // Capture screenshot of the current tab
        chrome.tabs
          .captureVisibleTab(sender.tab.windowId, {
            format: "png",
            quality: 80,
          })
          .then((dataUrl) => {
            console.log(
              "[Unigraph] Screenshot captured successfully, sending to content script"
            );

            // Send screenshot back to content script for cropping
            chrome.tabs
              .sendMessage(sender.tab.id, {
                type: "unigraph_area_capture_screenshot",
                dataUrl,
                rect,
                devicePixelRatio,
                pageUrl,
                title,
                scrollX,
                scrollY,
              })
              .then(() => {
                console.log(
                  "[Unigraph] Screenshot sent to content script successfully"
                );
                sendResponse({ success: true });
              })
              .catch((error) => {
                console.error(
                  "[Unigraph] Failed to send screenshot to content script:",
                  error
                );
                sendResponse({ success: false, error: error.message });
              });
          })
          .catch((error) => {
            console.error(
              "[Unigraph] Failed to capture screenshot for area capture:",
              error
            );
            sendResponse({ success: false, error: error.message });
          });
      }, 150); // 150ms delay to ensure overlay is removed

      return true; // Keep message channel open for async response
    }

    // Handle annotation window opening request from content script
    if (message && message.type === "open_annotation_window") {
      console.log("[Unigraph] Opening annotation window from content script");
      console.log("[Unigraph] Annotation URL:", message.annotationUrl);

      chrome.windows
        .create({
          url: message.annotationUrl,
          type: "popup",
          width: 400,
          height: 500,
          focused: true,
        })
        .then((window) => {
          console.log(
            "[Unigraph] Annotation window created successfully:",
            window
          );
          sendResponse({ success: true, windowId: window?.id });
        })
        .catch((error) => {
          console.error(
            "[Unigraph] Failed to create annotation window:",
            error
          );
          sendResponse({ success: false, error: error.message });
        });

      return true; // Keep message channel open for async response
    }
  }
);

// Handle extension icon click
chrome.action.onClicked.addListener(async (tab) => {
  if (!tab || !tab.url) {
    console.log("[Unigraph] No active tab or URL found");
    return;
  }

  // Refresh context menu before checking login status
  const isLoggedIn = await isUserLoggedIn();
  createContextMenus(isLoggedIn);

  if (!isLoggedIn) {
    // Show login notification
    chrome.notifications?.create({
      type: "basic",
      iconUrl: "icons/icon16.PNG",
      title: "Unigraph",
      message:
        "Please log in to use the extension. Right-click and select 'Log in to Unigraph'.",
    });
    return;
  }

  // Take a screenshot of the current tab
  try {
    const screenshot = await chrome.tabs.captureVisibleTab(tab.windowId, {
      format: "png",
      quality: 80,
    });

    // Create annotation URL with screenshot and page URL
    const encodedImageUrl = encodeURIComponent(screenshot);
    const encodedPageUrl = encodeURIComponent(tab.url);
    const annotationUrl = `annotation.html?imageUrl=${encodedImageUrl}&pageUrl=${encodedPageUrl}`;

    // Open annotation window
    chrome.windows.create({
      url: annotationUrl,
      type: "popup",
      width: 400,
      height: 500,
      focused: true,
    });

    console.log("[Unigraph] Opened annotation window with screenshot");
  } catch (error) {
    console.error("[Unigraph] Failed to capture screenshot:", error);
    // Fallback: open annotation without screenshot
    const encodedPageUrl = encodeURIComponent(tab.url);
    const annotationUrl = `annotation.html?pageUrl=${encodedPageUrl}`;

    chrome.windows.create({
      url: annotationUrl,
      type: "popup",
      width: 400,
      height: 500,
      focused: true,
    });
  }
});

chrome.contextMenus.onClicked.addListener(
  async (info: chrome.contextMenus.OnClickData, tab?: chrome.tabs.Tab) => {
    if (info.menuItemId === "loginToUnigraph") {
      console.log("[Unigraph] 'Log in to Unigraph' menu clicked");
      // @ts-ignore
      if (typeof (self as any).authenticateWithGoogle === "function") {
        console.log("[Unigraph] Calling authenticateWithGoogle...");
        // @ts-ignore
        (self as any)
          .authenticateWithGoogle()
          .then((result: any) => {
            // Save session and user info with debug log
            if (result && result.session && result.user) {
              chrome.storage.local.set(
                {
                  supabase_session: result.session,
                  user_info: result.user,
                },
                () => {
                  console.log(
                    "[Unigraph] Session saved to storage after login:",
                    result.session
                  );
                  createContextMenus(true);
                  console.log("[Unigraph] Context menu refreshed after login");
                }
              );
            } else {
              console.warn(
                "[Unigraph] No session/user returned from authenticateWithGoogle"
              );
              createContextMenus(true);
            }
          })
          .catch((err: any) => {
            console.error("[Unigraph] Authentication failed:", err);
            chrome.notifications?.create({
              type: "basic",
              iconUrl: "icons/icon16.png",
              title: "Unigraph Login Error",
              message: "Failed to log in. See background page for details.",
            });
          });
      } else {
        console.error("[Unigraph] authenticateWithGoogle not loaded");
        chrome.notifications?.create({
          type: "basic",
          iconUrl: "icons/icon16.png",
          title: "Unigraph Error",
          message: "Login function not loaded. Try reloading the extension.",
        });
      }
      return;
    }
    if (info.menuItemId === "logoutOfUnigraph") {
      chrome.storage.local.remove(["supabase_session", "user_info"], () => {
        createContextMenus(false);
        console.log("[Unigraph] Context menu refreshed after logout");
        chrome.notifications?.create({
          type: "basic",
          iconUrl: "icons/icon16.png",
          title: "Unigraph",
          message: "You have been logged out.",
        });
      });
      return;
    }
    // --- Unigraph: Show panel ---
    if (info.menuItemId === "showUnigraphPanel") {
      chrome.windows.create({
        url: "https://unigraph.vercel.app/",
        type: "popup",
        width: 900,
        height: 700,
        top: 80,
        left: 80,
        focused: true,
      });
      return;
    }
    // --- Unigraph: Create Annotation ---
    if (info.menuItemId === "createAnnotation") {
      // Validate session before opening annotation window
      if (!(await validateSessionBeforeAction())) {
        return;
      }

      let annotationUrl: string | undefined;
      if (info.srcUrl) {
        // Image annotation
        const encodedImageUrl = encodeURIComponent(info.srcUrl);
        annotationUrl = `annotation.html?imageUrl=${encodedImageUrl}&pageUrl=${encodeURIComponent(
          tab && tab.url ? tab.url : ""
        )}`;
      } else if (info.selectionText) {
        // Text annotation
        const encodedText = encodeURIComponent(info.selectionText);
        const encodedPageUrl = encodeURIComponent(
          tab && tab.url ? tab.url : ""
        );
        annotationUrl = `annotation.html?text=${encodedText}&pageUrl=${encodedPageUrl}`;
      } else {
        return;
      }
      chrome.windows.create({
        url: annotationUrl,
        type: "popup",
        width: 320,
        height: 340,
        focused: true,
      });
      return;
    }
    // --- Unigraph: Save selection ---
    if (info.menuItemId === "saveSelectionToUnigraph" && info.selectionText) {
      const encodedText = encodeURIComponent(info.selectionText);
      chrome.tabs.create({
        url: `https://unigraph.vercel.app/?text=${encodedText}`,
      });
      return;
    }
    // --- Unigraph: Save page ---
    if (info.menuItemId === "savePageToUnigraph" && tab && tab.url) {
      // Validate session before opening annotation window
      if (!(await validateSessionBeforeAction())) {
        return;
      }

      // Take a screenshot of the current tab (like savePageAsScreenshot)
      const pageUrl = tab.url || "";
      chrome.tabs
        .captureVisibleTab(tab.windowId, {
          format: "png",
          quality: 80,
        })
        .then((screenshot) => {
          // Create annotation URL with screenshot and page URL
          const encodedImageUrl = encodeURIComponent(screenshot);
          const encodedPageUrl = encodeURIComponent(pageUrl);
          const annotationUrl = `annotation.html?imageUrl=${encodedImageUrl}&pageUrl=${encodedPageUrl}`;
          chrome.windows.create({
            url: annotationUrl,
            type: "popup",
            width: 400,
            height: 500,
            focused: true,
          });
        })
        .catch((error) => {
          // Fallback: open annotation without screenshot
          const encodedPageUrl = encodeURIComponent(pageUrl);
          const annotationUrl = `annotation.html?pageUrl=${encodedPageUrl}`;
          chrome.windows.create({
            url: annotationUrl,
            type: "popup",
            width: 400,
            height: 500,
            focused: true,
          });
        });
      return;
    }
    // --- Unigraph: Save page as screenshot ---
    if (info.menuItemId === "savePageAsScreenshot" && tab && tab.url) {
      // Validate session before opening annotation window
      if (!(await validateSessionBeforeAction())) {
        return;
      }

      // Take a screenshot of the current tab
      chrome.tabs
        .captureVisibleTab(tab.windowId, {
          format: "png",
          quality: 80,
        })
        .then((screenshot) => {
          // Create annotation URL with screenshot and page URL
          const encodedImageUrl = encodeURIComponent(screenshot);
          const encodedPageUrl = encodeURIComponent(tab.url!);
          const annotationUrl = `annotation.html?imageUrl=${encodedImageUrl}&pageUrl=${encodedPageUrl}`;

          // Open annotation window
          chrome.windows.create({
            url: annotationUrl,
            type: "popup",
            width: 400,
            height: 500,
            focused: true,
          });

          console.log(
            "[Unigraph] Opened annotation window with screenshot from context menu"
          );
        })
        .catch((error) => {
          console.error("[Unigraph] Failed to capture screenshot:", error);
          // Fallback: open annotation without screenshot
          const encodedPageUrl = encodeURIComponent(tab.url!);
          const annotationUrl = `annotation.html?pageUrl=${encodedPageUrl}`;

          chrome.windows.create({
            url: annotationUrl,
            type: "popup",
            width: 400,
            height: 500,
            focused: true,
          });
        });
      return;
    }
    // --- Unigraph: Open SVG ---
    let svgUrl =
      info.srcUrl || info.linkUrl || (tab && tab.url ? tab.url : undefined);
    if (svgUrl && svgUrl.startsWith("data:image")) {
      chrome.notifications?.create({
        type: "basic",
        iconUrl: "icons/icon16.png",
        title: "Unigraph",
        message:
          "Cannot use base64-encoded SVGs. Try using an online-hosted SVG.",
      });
      return;
    }
    if (svgUrl && svgUrl.endsWith(".svg")) {
      let encodedSvgUrl = encodeURIComponent(svgUrl);
      chrome.tabs.create({
        url: `https://unigraph.vercel.app/?svgUrl=${encodedSvgUrl}`,
      });
    } else if (info.menuItemId === "two") {
      chrome.notifications?.create({
        type: "basic",
        iconUrl: "icons/icon16.png",
        title: "Unigraph",
        message: "The selected URL is not an SVG file.",
      });
    }
    // --- Unigraph: Open Dev App ---
    if (info.menuItemId === "openDevApp") {
      chrome.windows.create({
        url: "http://localhost:3000/",
        type: "popup",
        width: 900,
        height: 700,
        top: 80,
        left: 80,
        focused: true,
      });
      return;
    }
    if (info.menuItemId === "saveAreaAsImage" && tab && tab.id) {
      // Validate session before opening area capture
      if (!(await validateSessionBeforeAction())) {
        return;
      }

      console.log(
        "[Unigraph] Save area as image clicked, checking if already active"
      );

      // First check if area capture is already active in the tab
      chrome.scripting
        .executeScript({
          target: { tabId: Number(tab.id) },
          func: () => {
            return (window as any).__unigraphAreaCaptureActive || false;
          },
        })
        .then((results) => {
          const isActive = results[0]?.result;
          console.log("[Unigraph] Area capture active status:", isActive);

          if (isActive) {
            console.log(
              "[Unigraph] Area capture already active, skipping injection"
            );
            return;
          }

          // Inject the script only if not already active
          console.log("[Unigraph] Injecting area capture script");
          return chrome.scripting.executeScript({
            target: { tabId: Number(tab.id) },
            files: ["area-capture.js"],
          });
        })
        .catch((error) => {
          console.error(
            "[Unigraph] Error checking or injecting area capture script:",
            error
          );
        });

      return;
    }
    // --- Unigraph: Save PDF ---
    if (info.menuItemId === "savePdfToUnigraph") {
      // Validate session before opening annotation window
      if (!(await validateSessionBeforeAction())) {
        return;
      }

      let pdfUrl: string | undefined;

      // Check if we have a link URL (when right-clicking on a PDF link)
      if (info.linkUrl && info.linkUrl.toLowerCase().endsWith(".pdf")) {
        pdfUrl = info.linkUrl;
      }
      // Check if we're on a PDF page
      else if (tab && tab.url && tab.url.toLowerCase().endsWith(".pdf")) {
        pdfUrl = tab.url;
      }
      // Check if we have a src URL (when right-clicking on a PDF element)
      else if (info.srcUrl && info.srcUrl.toLowerCase().endsWith(".pdf")) {
        pdfUrl = info.srcUrl;
      }
      // Check if we're on a page that might contain PDF elements
      else if (tab && tab.url) {
        console.log(
          "[Unigraph] Attempting to extract PDF URL from page:",
          tab.url
        );

        // Try to extract PDF URL from the page by injecting a script
        chrome.scripting
          .executeScript({
            target: { tabId: tab.id! },
            func: () => {
              console.log("[Unigraph] PDF detection script running");

              // Look for PDF embed elements with original-url attribute (Chrome PDF viewer)
              const pdfEmbeds = document.querySelectorAll(
                'embed[original-url*=".pdf"], embed[original-url*="/pdf/"]'
              );
              console.log(
                "[Unigraph] Found PDF embeds with original-url:",
                pdfEmbeds.length
              );
              if (pdfEmbeds.length > 0) {
                const embed = pdfEmbeds[0] as HTMLEmbedElement;
                const originalUrl = embed.getAttribute("original-url");
                console.log("[Unigraph] Original URL found:", originalUrl);
                if (originalUrl) {
                  return originalUrl;
                }
              }

              // Look for PDF embed elements with src containing .pdf or /pdf/
              const pdfEmbedsSrc = document.querySelectorAll(
                'embed[src*=".pdf"], embed[src*="/pdf/"]'
              );
              console.log(
                "[Unigraph] Found PDF embeds with src:",
                pdfEmbedsSrc.length
              );
              if (pdfEmbedsSrc.length > 0) {
                const embed = pdfEmbedsSrc[0] as HTMLEmbedElement;
                console.log("[Unigraph] Src URL found:", embed.src);
                return embed.src;
              }

              // Look for PDF embed elements with type containing pdf
              const pdfEmbedsType =
                document.querySelectorAll('embed[type*="pdf"]');
              console.log(
                "[Unigraph] Found PDF embeds with type:",
                pdfEmbedsType.length
              );
              if (pdfEmbedsType.length > 0) {
                const embed = pdfEmbedsType[0] as HTMLEmbedElement;
                const result =
                  embed.src ||
                  embed.getAttribute("data") ||
                  embed.getAttribute("original-url");
                console.log("[Unigraph] Type-based URL found:", result);
                return result;
              }

              // Look for PDF object elements
              const pdfObjects = document.querySelectorAll(
                'object[data*=".pdf"], object[data*="/pdf/"]'
              );
              console.log("[Unigraph] Found PDF objects:", pdfObjects.length);
              if (pdfObjects.length > 0) {
                const obj = pdfObjects[0] as HTMLObjectElement;
                console.log("[Unigraph] Object data found:", obj.data);
                return obj.data;
              }

              // Look for any embed element and check its attributes for PDF URLs
              const allEmbeds = document.querySelectorAll("embed");
              console.log("[Unigraph] Found all embeds:", allEmbeds.length);
              for (let i = 0; i < allEmbeds.length; i++) {
                const embed = allEmbeds[i] as HTMLEmbedElement;
                const originalUrl = embed.getAttribute("original-url");
                const src = embed.src;
                const data = embed.getAttribute("data");

                console.log(
                  "[Unigraph] Checking embed",
                  i,
                  "original-url:",
                  originalUrl,
                  "src:",
                  src,
                  "data:",
                  data
                );

                if (
                  originalUrl &&
                  (originalUrl.includes(".pdf") ||
                    originalUrl.includes("/pdf/"))
                ) {
                  console.log(
                    "[Unigraph] Found PDF in original-url:",
                    originalUrl
                  );
                  return originalUrl;
                }
                if (src && (src.includes(".pdf") || src.includes("/pdf/"))) {
                  console.log("[Unigraph] Found PDF in src:", src);
                  return src;
                }
                if (data && (data.includes(".pdf") || data.includes("/pdf/"))) {
                  console.log("[Unigraph] Found PDF in data:", data);
                  return data;
                }
              }

              // Look for PDF links
              const pdfLinks = document.querySelectorAll(
                'a[href*=".pdf"], a[href*="/pdf/"]'
              );
              console.log("[Unigraph] Found PDF links:", pdfLinks.length);
              if (pdfLinks.length > 0) {
                const href = (pdfLinks[0] as HTMLAnchorElement).href;
                console.log("[Unigraph] Link href found:", href);
                return href;
              }

              // Check if current page URL contains .pdf or /pdf/
              if (
                window.location.href.toLowerCase().includes(".pdf") ||
                window.location.href.toLowerCase().includes("/pdf/")
              ) {
                console.log(
                  "[Unigraph] Current URL contains PDF:",
                  window.location.href
                );
                return window.location.href;
              }

              console.log("[Unigraph] No PDF URL found in page");
              return null;
            },
          })
          .then((results) => {
            console.log("[Unigraph] Script execution results:", results);
            const result = results[0]?.result;
            console.log("[Unigraph] Extracted result:", result);
            if (result) {
              pdfUrl = result;
            }

            if (pdfUrl) {
              // Create annotation URL with PDF URL
              const encodedPdfUrl = encodeURIComponent(pdfUrl);
              const annotationUrl = `annotation.html?pdfUrl=${encodedPdfUrl}&pageUrl=${encodedPdfUrl}`;
              console.log(
                "[Unigraph] Creating annotation window with URL:",
                annotationUrl
              );

              chrome.windows.create({
                url: annotationUrl,
                type: "popup",
                width: 400,
                height: 500,
                focused: true,
              });

              console.log(
                "[Unigraph] Opened annotation window for PDF:",
                pdfUrl
              );
            } else {
              console.log("[Unigraph] No PDF URL found in page content");
            }
          })
          .catch((error) => {
            console.error("[Unigraph] Error extracting PDF URL:", error);
          });

        return; // Return early since we're handling this asynchronously
      }

      if (pdfUrl) {
        // Create annotation URL with PDF URL
        const encodedPdfUrl = encodeURIComponent(pdfUrl);
        const annotationUrl = `annotation.html?pdfUrl=${encodedPdfUrl}&pageUrl=${encodedPdfUrl}`;

        chrome.windows.create({
          url: annotationUrl,
          type: "popup",
          width: 400,
          height: 500,
          focused: true,
        });

        console.log("[Unigraph] Opened annotation window for PDF:", pdfUrl);
      } else {
        console.log("[Unigraph] No PDF URL found in context menu data");
      }
      return;
    }
  }
);
