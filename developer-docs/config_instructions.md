# Unigraph Chrome Extension

## Setup Instructions

### 1. Google OAuth Setup

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Navigate to "APIs & Services" > "Credentials"
4. Click "Create credentials" > "OAuth client ID"
5. Select "Chrome App" as the Application type
6. Enter your extension's name
7. For the Application ID, use your extension's ID:
   - You can find this by loading your extension in developer mode and copying the ID from chrome://extensions/
8. Click "Create"
9. Copy the generated client ID

### 2. Update the Extension

1. Replace `YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com` in manifest.json with your actual Google client ID
2. Make sure your Supabase project has Google OAuth configured with the same client ID

### 3. Supabase Setup

1. In your Supabase dashboard, go to Authentication > Providers
2. Enable Google provider
3. Configure it with the same Google client ID and secret
4. Set the authorized redirect URL to your extension's redirect URL

## Testing

After setting up properly, the authentication flow should work without the "bad client id" error.

Right clicking on svg page documents includes a Context Menu Action to open in Unigraph.

This action opens a new tab on the Unigraph website with the svg loaded in as a SceneGraph.

## Icon Troubleshooting

If your extension icons are not displaying correctly:

1. **Verify icon paths**:

   - Make sure all icon files exist in the `/icons` directory
   - (Not required): icon sizes: 16x16, 48x48, 128x128 pixels
   - Run `node scripts/verify-icons.js` to check if files exist

2. **Reload the extension**:

   - Go to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top-right)
   - Click the "Reload" button on your extension card
   - Restart Chrome completely

3. **Clear browser cache**:

   - Open Chrome DevTools (F12)
   - Right-click on the refresh button and select "Empty Cache and Hard Reload"

4. **Generate new icons**:

   - Open `/icons/create-icon.html` in your browser
   - Create and download new icons
   - Place them in the `/icons` directory

5. **Check manifest.json**:
   - Ensure both "action.default_icon" and "icons" sections are present
   - The paths should be relative to the extension root
