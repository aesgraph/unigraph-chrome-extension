// area-capture.js
(function () {
  console.log("Area capture script loaded");

  // Prevent multiple instances
  if (window.__unigraphAreaCaptureActive) {
    console.log("[Unigraph] Area capture already active, skipping");
    return;
  }

  // Clean up any existing listeners
  if (window.__unigraphAreaCaptureListener) {
    console.log("[Unigraph] Removing existing message listener");
    chrome.runtime.onMessage.removeListener(
      window.__unigraphAreaCaptureListener
    );
  }

  window.__unigraphAreaCaptureActive = true;

  // Create overlay
  const overlay = document.createElement("div");
  overlay.style.position = "fixed";
  overlay.style.top = "0";
  overlay.style.left = "0";
  overlay.style.width = "100vw";
  overlay.style.height = "100vh";
  overlay.style.zIndex = "999999";
  overlay.style.background = "rgba(0,0,0,0.08)";
  overlay.style.cursor = "crosshair";
  overlay.style.userSelect = "none";
  document.body.appendChild(overlay);

  let startX, startY, endX, endY;
  let selectionBox = document.createElement("div");
  selectionBox.style.position = "fixed";
  selectionBox.style.border = "2px dashed #1976d2";
  selectionBox.style.background = "rgba(25,118,210,0.15)";
  selectionBox.style.zIndex = "1000000";
  selectionBox.style.pointerEvents = "none";
  overlay.appendChild(selectionBox);

  function onMouseDown(e) {
    startX = e.clientX;
    startY = e.clientY;
    selectionBox.style.display = "block";
    overlay.addEventListener("mousemove", onMouseMove);
    overlay.addEventListener("mouseup", onMouseUp);
  }

  function onMouseMove(e) {
    endX = e.clientX;
    endY = e.clientY;
    const x = Math.min(startX, endX);
    const y = Math.min(startY, endY);
    const w = Math.abs(startX - endX);
    const h = Math.abs(startY - endY);
    selectionBox.style.left = x + "px";
    selectionBox.style.top = y + "px";
    selectionBox.style.width = w + "px";
    selectionBox.style.height = h + "px";
  }

  function onMouseUp(e) {
    overlay.removeEventListener("mousemove", onMouseMove);
    overlay.removeEventListener("mouseup", onMouseUp);
    endX = e.clientX;
    endY = e.clientY;
    const x = Math.min(startX, endX);
    const y = Math.min(startY, endY);
    const w = Math.abs(startX - endX);
    const h = Math.abs(startY - endY);

    // Remove overlay immediately to avoid capturing it in screenshot
    if (document.body.contains(overlay)) {
      document.body.removeChild(overlay);
    }

    // Clean up state
    window.__unigraphAreaCaptureActive = false;

    // Send coordinates to background
    console.log("Area selected, sending message to background", { x, y, w, h });
    chrome.runtime.sendMessage({
      type: "unigraph_area_capture",
      rect: { x, y, w, h },
      devicePixelRatio: window.devicePixelRatio,
      pageUrl: window.location.href,
      title: document.title,
      scrollX: window.scrollX,
      scrollY: window.scrollY,
    });
  }

  overlay.addEventListener("mousedown", onMouseDown);

  // Create message listener function
  const messageListener = function (msg) {
    console.log("[Unigraph] Content script received message:", msg);

    if (msg && msg.type === "unigraph_area_capture_screenshot") {
      console.log("[Unigraph] Processing area capture screenshot");
      console.log("[Unigraph] Message data:", {
        rect: msg.rect,
        devicePixelRatio: msg.devicePixelRatio,
        pageUrl: msg.pageUrl,
        title: msg.title,
        scrollX: msg.scrollX,
        scrollY: msg.scrollY,
        dataUrlLength: msg.dataUrl ? msg.dataUrl.length : 0,
      });

      const {
        dataUrl,
        rect,
        devicePixelRatio,
        pageUrl,
        title,
        scrollX,
        scrollY,
      } = msg;

      const img = new window.Image();
      img.onload = function () {
        console.log(
          "[Unigraph] Screenshot image loaded, starting crop process"
        );
        try {
          const canvas = document.createElement("canvas");
          const sx = (rect.x + scrollX) * devicePixelRatio;
          const sy = (rect.y + scrollY) * devicePixelRatio;
          const sw = rect.w * devicePixelRatio;
          const sh = rect.h * devicePixelRatio;

          console.log("[Unigraph] Crop parameters:", {
            sx,
            sy,
            sw,
            sh,
            originalRect: rect,
            scrollX,
            scrollY,
            devicePixelRatio,
          });

          canvas.width = sw;
          canvas.height = sh;
          const ctx = canvas.getContext("2d");
          if (!ctx) throw new Error("No 2d context");

          console.log("[Unigraph] Drawing cropped image to canvas");
          ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);

          const croppedDataUrl = canvas.toDataURL("image/png");
          console.log(
            "[Unigraph] Cropped image created, length:",
            croppedDataUrl.length
          );

          // Open annotation window with cropped image
          const encodedImageUrl = encodeURIComponent(croppedDataUrl);
          const encodedPageUrl = encodeURIComponent(pageUrl);
          const annotationUrl = `annotation.html?imageUrl=${encodedImageUrl}&pageUrl=${encodedPageUrl}`;

          console.log(
            "[Unigraph] Opening annotation window with URL:",
            annotationUrl.substring(0, 100) + "..."
          );

          // Use chrome.windows.create instead of window.open for better control
          chrome.runtime.sendMessage(
            {
              type: "open_annotation_window",
              annotationUrl: annotationUrl,
            },
            (response) => {
              if (chrome.runtime.lastError) {
                console.error(
                  "[Unigraph] Failed to open annotation window:",
                  chrome.runtime.lastError
                );
                // Fallback to window.open
                window.open(annotationUrl, "_blank", "width=400,height=500");
              } else {
                console.log("[Unigraph] Annotation window opened successfully");
              }
            }
          );
        } catch (err) {
          console.error(
            "[Unigraph] Error cropping or opening annotation window:",
            err
          );
        }
      };

      img.onerror = function (e) {
        console.error("[Unigraph] Image failed to load for cropping:", e);
      };

      console.log("[Unigraph] Setting image source for cropping");
      img.src = dataUrl;
    }
  };

  // Store listener reference for cleanup
  window.__unigraphAreaCaptureListener = messageListener;

  // Listen for screenshot from background, crop, and open annotation window
  chrome.runtime.onMessage.addListener(messageListener);
})();
