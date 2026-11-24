# Quran-Club

## Manual gallery

The gallery is a static page with no database or upload service. To add media:

1. Put each image or video file in the site's `images/` folder.
2. Replace the “No media has been added yet” paragraph inside `.gallery-grid`
   with one or more cards. For example:

   ```html
   <article class="gallery-item">
       <img src="images/community.jpg" alt="Club community gathering" loading="lazy">
       <h2>Community Gathering</h2>
   </article>
   ```

   For a video, use a `<video controls>` element with a `<source>` pointing to
   its file in `images/`, then add the title in an `<h2>`.
3. Run `firebase deploy --only hosting` from the repository root to publish the
   site changes.

The admin dashboard remains on its original password login. It does not upload
or publish gallery items; gallery updates are made in the site files.