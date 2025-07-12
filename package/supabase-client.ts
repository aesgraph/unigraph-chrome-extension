// Supabase configuration

const SUPABASE_URL = process.env.SUPABASE_URL as string;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY as string;

// Type definitions
interface SupabaseSession {
  access_token: string;
  refresh_token: string;
  user: {
    id: string;
    email?: string;
    name?: string;
    full_name?: string;
  };
}

interface AnnotationData {
  title: string;
  data: {
    selected_text?: string;
    image_url?: string;
    comment: string;
    secondary_comment?: string;
    tags?: string[];
  };
  parent_resource_type: string;
  parent_resource_id: string;
  user_id: string;
}

interface Annotation {
  selectedText?: string;
  imageUrl?: string;
  comment: string;
  secondaryComment?: string;
  tags?: string[];
  pageUrl: string;
}

interface AuthResult {
  session: SupabaseSession;
  user: SupabaseSession["user"];
}

// Helper function to initialize the Supabase client
async function initSupabase(): Promise<any> {
  // Use the globally available Supabase client from the UMD bundle
  if (
    typeof (self as any).supabase !== "undefined" &&
    (self as any).supabase.createClient
  ) {
    return (self as any).supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  } else {
    throw new Error(
      "Supabase client not loaded. Please check if supabase-bundle.js is loaded correctly."
    );
  }
}

// Function to authenticate with Google and get Supabase session
async function authenticateWithGoogle(): Promise<AuthResult> {
  return new Promise(async (resolve, reject) => {
    try {
      const supabase = await initSupabase();
      const redirectUri = `https://${chrome.runtime.id}.chromiumapp.org/`;
      const authUrl = `${SUPABASE_URL}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(
        redirectUri
      )}`;

      chrome.identity.launchWebAuthFlow(
        {
          url: authUrl,
          interactive: true,
        },
        async (redirectUrl) => {
          if (chrome.runtime.lastError) {
            console.error("Chrome identity error:", chrome.runtime.lastError);
            return reject(chrome.runtime.lastError);
          }
          if (!redirectUrl) {
            return reject(new Error("No redirect URL received"));
          }

          // Extract tokens from the URL fragment
          const fragment = new URL(redirectUrl).hash.substring(1);
          const params = new URLSearchParams(fragment);
          const access_token = params.get("access_token");
          const refresh_token = params.get("refresh_token");

          if (!access_token) {
            return reject(new Error("No access token received"));
          }

          // Set the session in Supabase
          const { data, error } = await supabase.auth.setSession({
            access_token,
            refresh_token,
          });

          if (error) {
            return reject(error);
          }

          // Save session and user info
          chrome.storage.local.set(
            {
              supabase_session: data.session,
              user_info: data.user,
            },
            () => {
              resolve({ session: data.session, user: data.user });
            }
          );
        }
      );
    } catch (error) {
      console.error("Authentication process error:", error);
      reject(error);
    }
  });
}

// Function to save annotation to Supabase
async function saveAnnotation(annotation: Annotation): Promise<any> {
  try {
    // Get session from storage
    const data: any = await new Promise((resolve) => {
      chrome.storage.local.get(["supabase_session"], resolve);
    });

    // Check for valid session
    if (!data.supabase_session || !data.supabase_session.access_token) {
      console.log("No valid session found, re-authenticating...");
      await authenticateWithGoogle();
      // Re-fetch session after authentication
      const refreshed: any = await new Promise((resolve) => {
        chrome.storage.local.get(["supabase_session"], resolve);
      });
      data.supabase_session = refreshed.supabase_session;
    }

    const supabase = await initSupabase();
    await supabase.auth.setSession({
      access_token: data.supabase_session.access_token,
      refresh_token: data.supabase_session.refresh_token,
    });

    const currentSession = await supabase.auth.getSession();

    // Create the data object that matches the schema
    let annotationData: AnnotationData;

    if (annotation.imageUrl) {
      // Image annotation
      annotationData = {
        title: annotation.comment || `Annotation from ${annotation.pageUrl}`,
        data: {
          image_url: annotation.imageUrl,
          comment: annotation.comment,
          secondary_comment: annotation.secondaryComment,
          ...(annotation.tags ? { tags: annotation.tags } : {}),
        },
        parent_resource_type: "webpage",
        parent_resource_id: annotation.pageUrl,
        user_id: data.supabase_session.user.id,
      };
    } else if (annotation.selectedText) {
      // Text annotation
      annotationData = {
        title: annotation.comment || `Annotation from ${annotation.pageUrl}`,
        data: {
          selected_text: annotation.selectedText,
          comment: annotation.comment,
          secondary_comment: annotation.secondaryComment,
          ...(annotation.tags ? { tags: annotation.tags } : {}),
        },
        parent_resource_type: "webpage",
        parent_resource_id: annotation.pageUrl,
        user_id: data.supabase_session.user.id,
      };
    } else {
      // Webpage annotation (no selected text or image)
      annotationData = {
        title:
          annotation.comment || `Webpage annotation from ${annotation.pageUrl}`,
        data: {
          comment: annotation.comment,
          secondary_comment: annotation.secondaryComment,
          ...(annotation.tags ? { tags: annotation.tags } : {}),
        },
        parent_resource_type: "webpage",
        parent_resource_id: annotation.pageUrl,
        user_id: data.supabase_session.user.id,
      };
    }

    // Insert annotation into Supabase
    const { data: insertData, error } = await supabase
      .from("annotations")
      .insert([annotationData]);

    if (error) throw error;
    return insertData;
  } catch (error) {
    console.error("Error saving annotation:", error);
    throw error;
  }
}

// Function to save a webpage to Supabase
async function saveWebpage(webpage: {
  url: string;
  title: string;
  html_content?: string;
  screenshot_url?: string;
  metadata?: any;
}): Promise<any> {
  try {
    // Get session from storage
    const data: any = await new Promise((resolve) => {
      chrome.storage.local.get(["supabase_session"], resolve);
    });
    if (!data.supabase_session || !data.supabase_session.access_token) {
      await authenticateWithGoogle();
      const refreshed: any = await new Promise((resolve) => {
        chrome.storage.local.get(["supabase_session"], resolve);
      });
      data.supabase_session = refreshed.supabase_session;
    }
    const supabase = await initSupabase();
    await supabase.auth.setSession({
      access_token: data.supabase_session.access_token,
      refresh_token: data.supabase_session.refresh_token,
    });
    // Check if the webpage already exists for this url
    console.log("Checking if webpage exists:", webpage.url);
    const { data: existing, error: selectError } = await supabase
      .from("webpages")
      .select("*")
      .eq("url", webpage.url)
      .limit(1);
    if (selectError) throw selectError;
    if (existing && existing.length > 0) {
      // Already exists, throw error
      console.log("Webpage already exists:", existing[0]);
      throw new Error("This webpage is already saved in your database.");
    }
    console.log("Webpage does not exist, inserting new record");
    // Insert new record
    const insertData = {
      url: webpage.url,
      user_id: data.supabase_session.user.id,
      title: webpage.title,
      html_content: webpage.html_content,
      screenshot_url: webpage.screenshot_url,
      metadata: webpage.metadata,
    };
    const { data: result, error } = await supabase
      .from("webpages")
      .insert([insertData]);
    console.log("Webpage save result:", result);
    console.log("Webpage save error:", error);
    if (error) throw error;
    return result;
  } catch (error) {
    console.error("Error saving webpage:", error);
    throw error;
  }
}

// Function to upload a screenshot to Supabase Storage and return the public URL
async function uploadScreenshot(base64Data: string): Promise<string> {
  try {
    const data: any = await new Promise((resolve) => {
      chrome.storage.local.get(["supabase_session"], resolve);
    });
    if (!data.supabase_session || !data.supabase_session.access_token) {
      await authenticateWithGoogle();
      const refreshed: any = await new Promise((resolve) => {
        chrome.storage.local.get(["supabase_session"], resolve);
      });
      data.supabase_session = refreshed.supabase_session;
    }
    const supabase = await initSupabase();
    await supabase.auth.setSession({
      access_token: data.supabase_session.access_token,
      refresh_token: data.supabase_session.refresh_token,
    });
    // Generate a unique filename
    const filename = `screenshot_${Date.now()}_${Math.floor(
      Math.random() * 1e6
    )}.png`;
    // Remove the data URL prefix if present
    const base64 = base64Data.replace(/^data:image\/png;base64,/, "");
    const fileData = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    // Upload to 'screenshots' bucket
    const { data: uploadData, error } = await supabase.storage
      .from("screenshots")
      .upload(filename, fileData, { contentType: "image/png" });
    if (error) throw error;
    // Get public URL
    const { publicURL } = supabase.storage
      .from("screenshots")
      .getPublicUrl(filename).data;
    return publicURL;
  } catch (error) {
    console.error("Error uploading screenshot:", error);
    throw error;
  }
}

// Check if user is already authenticated
async function isAuthenticated(): Promise<boolean> {
  const data: any = await new Promise((resolve) => {
    chrome.storage.local.get(["supabase_session"], resolve);
  });
  const result = !!(
    data.supabase_session && data.supabase_session.access_token
  );
  return result;
}

// Validate session with Supabase
async function validateSession(session: any): Promise<boolean> {
  try {
    const supabase = await initSupabase();
    await supabase.auth.setSession({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
    });

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      console.log("[Unigraph] Session validation failed:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("[Unigraph] Session validation error:", error);
    return false;
  }
}

// Make functions available globally
(self as any).authenticateWithGoogle = authenticateWithGoogle;
(self as any).saveAnnotation = saveAnnotation;
(self as any).isAuthenticated = isAuthenticated;
(self as any).saveWebpage = saveWebpage;
(self as any).uploadScreenshot = uploadScreenshot;
(self as any).validateSession = validateSession;
