### Wiki publication

The user guide is maintained in `docs/wiki`. The folder contains English, Simplified Chinese and French pages, a language selector, `_Sidebar.md` and `_Footer.md`. README links and the plugin guide point to the corresponding language.

#### Validate and publish

From the plugin source directory, run `npm run wiki:check` to check page names and internal links without accessing GitHub. Run `npm run wiki:publish` to publish using the source repository's existing Git authentication.

Before the first publication, enable Wiki in the GitHub repository settings and create and save its initial Home page. The publisher clones the separate `.wiki.git` repository, updates the Markdown pages maintained here, commits and pushes to its current default branch. Source links ending in `.md` are converted to Wiki page links. Other Wiki pages are retained; existing pages with the same names as these source pages are updated. No force push is used.

Local edits do not by themselves update the online Wiki. If networking or authentication fails, the script reports failure and does not claim publication. No token is stored in this project. The publisher cleans up only the temporary checkout created for that run.

#### Maintain the guide

Edit the matching English, Chinese and French pages together. Keep the source links valid and run the local check. Browser edits to pages managed by this folder must be copied back before the next publication, which replaces those same pages from the source. Interactive examples remain in `sample/Capture Sample`; they are linked by the Wiki rather than copied into it.

GitHub's [Wiki editing guide](https://docs.github.com/en/communities/documenting-your-project-with-wikis/adding-or-editing-wiki-pages) explains initial-page creation and the separate Wiki repository.
