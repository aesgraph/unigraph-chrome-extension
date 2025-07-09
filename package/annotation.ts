function debug(msg: any) {
  console.log(msg);
  const debugElem = document.getElementById("debug");
  if (debugElem) {
    debugElem.textContent += msg + "\n";
  }
}

try {
  // Get raw query string
  const query = window.location.search;

  // Parse each param separately
  const params = new URLSearchParams(query);

  // Handle image or text param
  const imageUrlParam = params.get("imageUrl");
  const textParam = params.get("text");
  const pageUrlParam = params.get("pageUrl");
  const imageOrTextContainer = document.getElementById("imageOrTextContainer");

  if (imageUrlParam && imageOrTextContainer) {
    // Show image
    try {
      const decodedImageUrl = decodeURIComponent(imageUrlParam);
      const img = document.createElement("img");
      img.src = decodedImageUrl;
      img.className = "annotation-image";
      img.alt = "Annotated image";
      imageOrTextContainer.appendChild(img);
    } catch (e) {
      imageOrTextContainer.textContent = "(Could not load image)";
    }
  } else if (textParam && imageOrTextContainer) {
    // Show selected text
    try {
      const decodedText = decodeURIComponent(textParam);
      const textDiv = document.createElement("div");
      textDiv.className = "selected-text";
      textDiv.id = "selectedText";
      textDiv.textContent = decodedText;
      imageOrTextContainer.appendChild(textDiv);
    } catch (e) {
      const textDiv = document.createElement("div");
      textDiv.className = "selected-text";
      textDiv.id = "selectedText";
      textDiv.textContent = textParam;
      imageOrTextContainer.appendChild(textDiv);
    }
  } else if (pageUrlParam && imageOrTextContainer) {
    // For webpage annotation, show a labeled, read-only field for Page URL
    const urlLabel = document.createElement("label");
    urlLabel.textContent = "Page URL";
    urlLabel.setAttribute("for", "pageUrlDisplay");
    urlLabel.style.fontWeight = "500";
    urlLabel.style.display = "block";
    urlLabel.style.marginBottom = "2px";
    const urlInput = document.createElement("input");
    urlInput.type = "text";
    urlInput.id = "pageUrlDisplay";
    urlInput.value = decodeURIComponent(pageUrlParam);
    urlInput.readOnly = true;
    urlInput.style.width = "100%";
    urlInput.style.background = "#f7f7f7";
    urlInput.style.border = "1px solid #e0e0e0";
    urlInput.style.borderRadius = "4px";
    urlInput.style.padding = "4px 8px";
    urlInput.style.fontSize = "13px";
    urlInput.style.marginBottom = "10px";
    imageOrTextContainer.appendChild(urlLabel);
    imageOrTextContainer.appendChild(urlInput);
  }

  // Handle URL param
  const urlParam = params.get("pageUrl");
  const pageUrlElem = document.getElementById("pageUrl");
  if (urlParam && pageUrlElem) {
    try {
      const decodedUrl = decodeURIComponent(urlParam);
      pageUrlElem.textContent = decodedUrl;
    } catch (e) {
      pageUrlElem.textContent = urlParam;
    }
  } else if (pageUrlElem) {
    pageUrlElem.textContent = "(No URL provided)";
  }

  // Check authentication status when page loads
  let authenticated = false;

  async function checkAuth() {
    try {
      authenticated = await (window as any).isAuthenticated();
      const saveBtn = document.getElementById(
        "saveBtn"
      ) as HTMLButtonElement | null;
      if (saveBtn) {
        saveBtn.textContent = "Save";
        if (!authenticated) {
          saveBtn.disabled = true;
          const msg = document.createElement("div");
          msg.style.color = "red";
          msg.style.margin = "8px 0";
          msg.textContent =
            "Please log in from the extension menu before saving annotations.";
          document.body.insertBefore(msg, saveBtn);
        }
      }
    } catch (err: any) {
      console.error(`Auth check error: ${err.message}`);
    }
  }

  // Call auth check on page load
  checkAuth();

  // Intelligent window sizing function - only for initial sizing
  function calculateOptimalSize() {
    // Get all relevant elements
    const selectedTextEl = document.getElementById("selectedText");
    const primaryComment = document.getElementById("primaryComment");
    const secondaryContainer = document.getElementById("secondaryContainer");
    const secondaryComment = document.getElementById("secondaryComment");

    // Calculate required height based on content
    let requiredHeight = 0;

    // Base padding and margins - increased for more spacious look
    const basePadding = 80; // Increased padding

    // Account for selected text height
    const selectedTextHeight = selectedTextEl ? selectedTextEl.scrollHeight : 0;

    // Primary comment height
    const primaryHeight = primaryComment ? primaryComment.scrollHeight : 0;

    // Secondary comment height (only if visible)
    let secondaryHeight = 0;
    if (
      secondaryContainer &&
      !secondaryContainer.classList.contains("secondary-comment-collapsed")
    ) {
      secondaryHeight = secondaryComment ? secondaryComment.scrollHeight : 0;
    }

    // Button and header elements - increased for more UI space
    const uiElementsHeight = 150; // Increased for more space

    // Calculate total required height with additional padding
    requiredHeight =
      selectedTextHeight +
      primaryHeight +
      secondaryHeight +
      uiElementsHeight +
      basePadding;

    // Set minimum height to ensure window is larger by default
    const minHeight = 450; // Increased default height

    // Set maximum height (85% of viewport height)
    const maxHeight = Math.floor(window.screen.height * 0.85);
    const finalHeight = Math.max(
      minHeight,
      Math.min(requiredHeight, maxHeight)
    );

    // Calculate width based on content
    const contentWidth = Math.max(
      selectedTextEl ? selectedTextEl.scrollWidth : 0,
      primaryComment ? primaryComment.scrollWidth : 0,
      secondaryComment ? secondaryComment.scrollWidth : 0
    );

    // Set reasonable width boundaries - increased for larger default size
    const minWidth = 450; // Increased from 400
    const maxWidth = Math.min(750, Math.floor(window.screen.width * 0.85)); // Increased from 700
    const finalWidth = Math.max(
      minWidth,
      Math.min(contentWidth + 80, maxWidth) // Added more padding to width
    );

    return {
      height: Math.ceil(finalHeight),
      width: Math.ceil(finalWidth),
    };
  }

  // Variable to track if initial sizing is done
  let initialSizingComplete = false;

  function requestResize() {
    const panelContent = document.querySelector(
      ".panel-content"
    ) as HTMLElement | null;
    const saveBtnContainer = document.querySelector(
      ".save-btn-container"
    ) as HTMLElement | null;
    const newHeight = Math.ceil(
      (panelContent ? panelContent.scrollHeight : 0) +
        (saveBtnContainer ? saveBtnContainer.offsetHeight : 0)
    );
    const newWidth = Math.ceil(document.body.scrollWidth);
    chrome.runtime.sendMessage({
      type: "resizeAnnotationWindow",
      height: newHeight,
      width: newWidth,
    });
  }

  // Remove the ResizeObserver to prevent continuous resizing
  // We'll only set the size once when the page loads

  // Auto-resize primary annotation textarea - but don't trigger window resize after initial setup
  const primaryComment = document.getElementById(
    "primaryComment"
  ) as HTMLTextAreaElement | null;
  function autoResizeTextarea(el: HTMLTextAreaElement) {
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 220) + "px";
    requestResize();
  }
  if (primaryComment) {
    primaryComment.addEventListener("input", function () {
      autoResizeTextarea(primaryComment);
    });
    // Initial resize
    autoResizeTextarea(primaryComment);
  }

  // Toggle secondary comment section
  const toggleSecondary = document.getElementById("toggleSecondary");
  if (toggleSecondary) {
    toggleSecondary.addEventListener("click", function () {
      const container = document.getElementById("secondaryContainer");
      if (!container) return;
      if (container.classList.contains("secondary-comment-collapsed")) {
        container.classList.remove("secondary-comment-collapsed");
        (this as HTMLElement).textContent = "- Hide secondary comment";
      } else {
        container.classList.add("secondary-comment-collapsed");
        (this as HTMLElement).textContent = "+ Add secondary comment";
      }
      requestResize();
    });
  }

  // Trigger initial sizing once when the page is fully loaded
  window.addEventListener("load", function () {
    // Short delay to ensure DOM is fully ready
    setTimeout(requestResize, 100);
  });

  // Initial request for sizing
  requestResize();

  // Tag input logic
  const tagsInput = document.getElementById(
    "tagsInput"
  ) as HTMLInputElement | null;
  const tagsInputContainer = document.getElementById(
    "tagsInputContainer"
  ) as HTMLElement | null;
  let tags: string[] = [];

  function renderTags() {
    if (!tagsInputContainer || !tagsInput) return;
    // Remove all chips except the input
    Array.from(tagsInputContainer.querySelectorAll(".tag-chip")).forEach((el) =>
      el.remove()
    );
    tags.forEach((tag, idx) => {
      const chip = document.createElement("span");
      chip.className = "tag-chip";
      chip.appendChild(document.createTextNode(tag));
      // Remove button
      const removeBtn = document.createElement("span");
      removeBtn.className = "remove-tag";
      removeBtn.textContent = "\u00D7";
      removeBtn.onclick = () => {
        tags.splice(idx, 1);
        renderTags();
      };
      chip.appendChild(removeBtn);
      tagsInputContainer.insertBefore(chip, tagsInput);
    });
  }

  function addTagFromInput() {
    if (!tagsInput) return;
    const value = tagsInput.value.trim();
    if (value) {
      tags.push(value);
      tagsInput.value = "";
      renderTags();
    }
  }

  if (tagsInput) {
    tagsInput.addEventListener("keydown", function (e: KeyboardEvent) {
      if (e.key === "Enter" || e.key === ",") {
        e.preventDefault();
        addTagFromInput();
      }
    });
    tagsInput.addEventListener("blur", addTagFromInput);
  }

  // On save, use the tags array
  const saveBtn = document.getElementById("saveBtn");
  if (saveBtn) {
    saveBtn.addEventListener("click", async function () {
      try {
        if (!authenticated) {
          alert(
            "Please log in from the extension menu before saving annotations."
          );
          return;
        }
        const primaryComment =
          (
            document.getElementById(
              "primaryComment"
            ) as HTMLTextAreaElement | null
          )?.value || "";
        const secondaryComment =
          (
            document.getElementById(
              "secondaryComment"
            ) as HTMLTextAreaElement | null
          )?.value || "";
        const pageUrl =
          (document.getElementById("pageUrl") as HTMLElement | null)
            ?.textContent || "";

        // If image annotation, save image_url in data field, no selectedText
        if (imageUrlParam) {
          await (window as any).saveAnnotation({
            imageUrl: decodeURIComponent(imageUrlParam),
            pageUrl,
            comment: primaryComment,
            secondaryComment,
            tags,
          });
        } else if (pageUrlParam && !textParam) {
          // Webpage annotation (no selected text or image)
          await (window as any).saveAnnotation({
            pageUrl,
            comment: primaryComment,
            secondaryComment,
            tags,
          });
        } else {
          // Text annotation
          const selectedText =
            (document.getElementById("selectedText") as HTMLElement | null)
              ?.textContent || "";
          await (window as any).saveAnnotation({
            selectedText,
            pageUrl,
            comment: primaryComment,
            secondaryComment,
            tags,
          });
        }

        alert("Annotation saved!");
        window.close();
      } catch (err: any) {
        console.error(`Error saving annotation:`, err);
        alert(
          "Failed to save annotation: " + (err.message || JSON.stringify(err))
        );
      }
    });
  }
} catch (err: any) {
  console.error("Critical error: " + err.message);
}
