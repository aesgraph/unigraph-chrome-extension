// Use importScripts for compatibility
// @ts-ignore
declare function importScripts(...urls: string[]): void;
importScripts("../supabase-bundle.js");
importScripts("./supabase-client.js");

let isCreatingMenus = false;

function createContextMenus(isLoggedIn: boolean) {
  if (isCreatingMenus) return;
  isCreatingMenus = true;
  chrome.contextMenus.removeAll(() => {
    if (!isLoggedIn) {
      chrome.contextMenus.create({
        id: "loginToUnigraph",
        title: "Log in to Unigraph",
        contexts: ["all"],
      });
      console.log("[Unigraph] Created 'Log in' context menu");
      isCreatingMenus = false;
    } else {
      chrome.storage.local.get(["user_info"], (data: any) => {
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
          title: "Save page as url",
          contexts: ["page"],
        });
        chrome.contextMenus.create({
          id: "savePageAsScreenshot",
          title: "Save page as screenshot",
          contexts: ["page"],
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
        chrome.contextMenus.create({
          id: "createAnnotation",
          title: "Create Annotation",
          contexts: ["selection", "image"],
        });
        console.log(
          "[Unigraph] Created full context menu with user info and logout"
        );
        isCreatingMenus = false;
      });
    }
  });
}

async function isUserLoggedIn(): Promise<boolean> {
  return new Promise((resolve) => {
    chrome.storage.local.get(["supabase_session"], (data: any) => {
      const session = data.supabase_session;
      resolve(!!(session && session.access_token));
    });
  });
}

isUserLoggedIn().then(createContextMenus);

chrome.runtime.onStartup.addListener(() => {
  isUserLoggedIn().then(createContextMenus);
});
chrome.runtime.onInstalled.addListener(() => {
  isUserLoggedIn().then(createContextMenus);
});

// Listen for resize requests from annotation popup
chrome.runtime.onMessage.addListener(
  (message: any, sender: any, sendResponse: any) => {
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
  }
);

// Handle extension icon click
chrome.action.onClicked.addListener(async (tab) => {
  if (!tab || !tab.url) {
    console.log("[Unigraph] No active tab or URL found");
    return;
  }

  // Check if user is logged in
  const isLoggedIn = await isUserLoggedIn();
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
  (info: chrome.contextMenus.OnClickData, tab?: chrome.tabs.Tab) => {
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
              iconUrl: "icon16.png",
              title: "Unigraph Login Error",
              message: "Failed to log in. See background page for details.",
            });
          });
      } else {
        console.error("[Unigraph] authenticateWithGoogle not loaded");
        chrome.notifications?.create({
          type: "basic",
          iconUrl: "icon16.png",
          title: "Unigraph Error",
          message: "Login function not loaded. Try reloading the extension.",
        });
      }
      return;
    }
    if (info.menuItemId === "logoutOfUnigraph") {
      chrome.storage.local.remove(["supabase_session", "user_info"], () => {
        createContextMenus(false);
        chrome.notifications?.create({
          type: "basic",
          iconUrl: "icon16.png",
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
      const encodedPageUrl = encodeURIComponent(tab.url);
      const annotationUrl = `annotation.html?pageUrl=${encodedPageUrl}`;
      chrome.windows.create({
        url: annotationUrl,
        type: "popup",
        width: 320,
        height: 340,
        focused: true,
      });
      return;
    }
    // --- Unigraph: Save page as screenshot ---
    if (info.menuItemId === "savePageAsScreenshot" && tab && tab.url) {
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
        iconUrl: "icon16.png",
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
        iconUrl: "icon16.png",
        title: "Unigraph",
        message: "The selected URL is not an SVG file.",
      });
    }
  }
);
