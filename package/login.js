function showError(message, formId = "emailError") {
  const errorDiv = document.getElementById(formId);
  errorDiv.textContent = message;
  errorDiv.classList.remove("hidden");
}

function hideError(formId = "emailError") {
  const errorDiv = document.getElementById(formId);
  errorDiv.classList.add("hidden");
}

function setLoading(loading) {
  const container = document.querySelector(".login-container");
  const submitBtn = document.getElementById("emailSubmitBtn");

  if (loading) {
    container.classList.add("loading");
    submitBtn.textContent = "Signing in...";
  } else {
    container.classList.remove("loading");
    submitBtn.textContent = "Sign In";
  }
}

async function signInWithEmailPassword(email, password) {
  try {
    setLoading(true);
    hideError();

    // Send message to background script to authenticate
    const result = await new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(
        {
          type: "authenticateWithEmailPassword",
          email: email,
          password: password,
        },
        (response) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else if (response && response.success) {
            resolve(response.data);
          } else {
            reject(new Error(response?.error || "Authentication failed"));
          }
        }
      );
    });

    if (result && result.session && result.user) {
      // Success - close the popup
      window.close();
    } else {
      throw new Error("Authentication failed");
    }
  } catch (error) {
    console.error("Email/password authentication error:", error);
    showError(
      error.message || "Authentication failed. Please check your credentials."
    );
  } finally {
    setLoading(false);
  }
}

async function signInWithGoogle() {
  try {
    setLoading(true);

    // Send message to background script to authenticate with Google
    const result = await new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(
        {
          type: "authenticateWithGoogle",
        },
        (response) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else if (response && response.success) {
            resolve(response.data);
          } else {
            reject(
              new Error(response?.error || "Google authentication failed")
            );
          }
        }
      );
    });

    if (result && result.session && result.user) {
      window.close();
    } else {
      throw new Error("Google authentication failed");
    }
  } catch (error) {
    console.error("Google authentication error:", error);
    showError("Google authentication failed. Please try again.");
  } finally {
    setLoading(false);
  }
}

async function signInWithGitHub() {
  try {
    setLoading(true);
    // For now, redirect to the main app for GitHub OAuth
    // This could be implemented similarly to Google OAuth
    chrome.tabs.create({
      url: "https://unigraph.vercel.app/signin",
    });
    window.close();
  } catch (error) {
    console.error("GitHub authentication error:", error);
    showError("GitHub authentication failed. Please try again.");
  } finally {
    setLoading(false);
  }
}

function showSignUp() {
  // Redirect to the main app for signup
  chrome.tabs.create({
    url: "https://unigraph.vercel.app/signin",
  });
  window.close();
}

// Initialize when DOM is loaded
document.addEventListener("DOMContentLoaded", function () {
  // Handle form submission
  document.getElementById("emailForm").addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    if (!email || !password) {
      showError("Please fill in all fields");
      return;
    }

    await signInWithEmailPassword(email, password);
  });

  // Handle Enter key in password field
  document.getElementById("password").addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      document.getElementById("emailForm").dispatchEvent(new Event("submit"));
    }
  });
});
