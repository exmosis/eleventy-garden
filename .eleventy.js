module.exports = function(eleventyConfig) {

    const path = require('path');

    const nhp = require('node-html-parser');
    
    const Image = require("@11ty/eleventy-img");

    const markdownIt = require('markdown-it');
    const markdownItOptions = {
        html: true,
        linkify: true
    };
    
    const md = markdownIt(markdownItOptions)
    .use(require('markdown-it-footnote'))
    .use(require('markdown-it-attrs'))
    .use(function(md) {
        // Recognize Mediawiki links ([[text]])
        md.linkify.add("[[", {
            validate: /^\s?([^\[\]\|\n\r]+)(\|[^\[\]\|\n\r]+)?\s?\]\]/,
            normalize: match => {
                const parts = match.raw.slice(2,-2).split("|");
                parts[0] = parts[0].replace(/.(md|markdown)\s?$/i, "");
                match.text = (parts[1] || parts[0]).trim();
                match.url = `/notes/${parts[0].trim()}/`;
            }
        })
    })
    
    eleventyConfig.addFilter("markdownify", string => {
        return md.render(string)
    })

    eleventyConfig.setLibrary('md', md);
    
    eleventyConfig.addCollection("notes", function (collection) {
        return collection.getFilteredByGlob(["notes/**/*.md", "index.md"]);
    });
    
    eleventyConfig.addPassthroughCopy('assets');
    // eleventyConfig.addPassthroughCopy('notes/**/*.{jpg,jpeg,png,gif}');

    const pageAssetsPlugin = require('eleventy-plugin-page-assets');

    
    eleventyConfig.addPlugin(pageAssetsPlugin, {
        mode: "parse",
        postsMatching: "*.md",
        assetsMatching: ".jpg",
        hashAssets: false,
        // recursive: true,
    });


    eleventyConfig.setUseGitIgnore(false);

    // parse images found in Markdown, based on code at
    // https://gist.github.com/Alexs7zzh/d92ae991ad05ed585d072074ea527b5c
    // if (process.env.ELEVENTY_ENV) {
        
    eleventyConfig.addTransform('transform', (content, outputPath) => {

        if (outputPath && outputPath.endsWith('.html')) {

            let outputPathDir = path.dirname(outputPath)
            // strip first directory, ie "_site"
            let relativePath = outputPathDir.substring(outputPathDir.indexOf('/') + 1)
            // strip second directory, ie "notes"
            let imgWwwPath = relativePath.substring(outputPathDir.indexOf('/') + 1)

            let document = nhp.parse(content)

            const options = {
                widths: [640, 1024, 1280, 1600],
                sizes: '(min-width: 1000px) 50vw, 100vw', // your responsive sizes here
                formats: ['webp', 'jpeg'],
                urlPath: '/' + imgWwwPath,
                outputDir: outputPathDir
            }
            
            // const images = [...document.querySelectorAll('figure img')]
            const images = [...document.querySelectorAll('img')]
    
            images.forEach((i, index) => {

                if (i.getAttribute('src').substring(0, 7) != '/assets' && 
                    i.getAttribute('src').substring(0, 7) != 'http://' && 
                    i.getAttribute('src').substring(0, 8) != 'https://') {

                    const src = './' + relativePath + '/' + i.getAttribute('src')

                    const meta = Image.statsSync(src, options)
                    const last = meta.jpeg[meta.jpeg.length - 1]
                    if (last.width < 500) return
                
                    Image(src, options)
                    i.setAttribute('width', last.width)
                    i.setAttribute('height', last.height)
                    if (index !== 0) {
                        i.setAttribute('loading', 'lazy')
                        i.setAttribute('decoding', 'async')
                    }

                    i.replaceWith(`
                    <picture class="optimised">
                        <source type="image/webp" sizes="${options.sizes}" srcset="${meta.webp.map(p => p.srcset).join(', ')}">
                        <source type="image/jpeg" sizes="${options.sizes}" srcset="${meta.jpeg.map(p => p.srcset).join(', ')}">
                        ${i.outerHTML}
                    </picture>`);
                }
            })

            return `<!DOCTYPE html>${document.outerHTML}`
        }

        return content
        })
    // }



    return {
        dir: {
            input: "./",
            output: "_site",
            layouts: "layouts",
            includes: "includes",
            data: "_data"
        },
        passthroughFileCopy: true
    }
}
