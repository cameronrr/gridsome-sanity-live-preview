# gridsome-sanity-live-preview

:warning: **Very new, very early, needs work, polish and love.**

## Overview

:warning: **Again, this is rather experimental at the moment.**
**Appreciate any help or suggestions to achieve the goal of this project!**

This plugin aims to provide live previews for Gridsome projects which are using Sanity Studio as a data source.

### Why

When working with a draft or publishing an updated document in Sanity Studio, you would usually need to rebuild the whole project to see the effect of the changes. Of course if you are a developer you could enable watchMode on a local project. However for an end user who is simply a content editor in the Studio, a live preview is an extremely useful tool to understand the effect of their changes before a proper publish / deploy / rebuild of the site takes place.

Further, Sanity Studio supports custom 'live preview' split panes, so you can see the preview without leaving the editor. It essentially works by rendering an iframe. The url we give to the iframe is one which will trigger the client side of our gridsome application to retrieve the latest information, and update the reactive data layer.

### How

The concept is simple:

- The page loads client side and checks for the presence of a query string i.e. 'preview'
- The plugin will then retrieve or attempt to generate a graphql preview query to Sanity Studio
- Authentication occurs by passing the users cookie/token from their logged in Studio session
- When the data is returned, then the components $page is updated using the built in reactive setter

## Status

### What is working

- For simple data types and image assets, the current approach does create a preview as expected.
- The documentation and notes here are very early, they will be improved over time as the package improves.

### What needs attention

#### Actual 'live' updates

- It would be amazing to implement a listener or an interval for retrieving updates while the page stays open.
- Currently, it's a small issue, you can just reload. In Sanity, toggle between 'Editor' and 'Web Preview' does a reload anyway.

#### Sanity References

- Data returned from Sanity usually contains references.
- Gridsome at the data store level does a good job resolving these
- We need a way to resolve these when querying the Sanity graphql api directly
- The main issue is with Blocks (block content / portable content)

## Usage

### Gridsome Project

This is implemented as a Vue plugin. Import and use in main.js.

`npm install gridsome-sanity-live-preview`

```javascript
// main.js
import GridsomeSanityLivePreview from "gridsome-sanity-live-preview";

export default function (Vue, { head, router, isClient }) {
 Vue.use(GridsomeSanityLivePreview, {
    // your chosen query string to trigger 'preview' processing
    previewParam: 'preview',
    // your graphql endpoint (also replace the 'default' tag if your project is different)
    // you can run sanity graphql list in your sanity project directory to see this
    graphqlEndpoint: 'https://<projectId>.api.sanity.io/v1/graphql/<dataset>/default',
  })

```

### Component Setup

When visiting a route and the previewParam is present in the query strings, the plugin will attempt to process a graphql query. That query needs to be defined on the component level. You would implement this on a 'page' or 'template'.

```javascript
// in your component script tag
export default {
  // ...
  pagePreviewQuery: `{ post: Post(id: $id) {
      title  publishedAt mainImage { altText asset { url } } excerpt bodyRaw }
  }`,
  // ...
};
```

- An alias is recommended and it must match the alias used in your `<page-query>`
- The type must be without 'sanity' prefix i.e. 'sanityPost' will be queried as 'Post' for the preview
- The $id variable must be included. The id will be passed in from the query params.
- Don't expect any 'raw' fields to work at the moment. This is the biggest issue so far.
  - '\_rawBody' fields are not available from sanity. This is gridsome Data Store specific.
  - The format which can be retrieved from sanity api directly is in the format 'bodyRaw'.
  - None of the references are resolved, this is usually handled by the gridsome data store layer.

#### Possible Improvement

Another idea to not require specifying a separate page preview query, is to inspect the $page object, and infer the query based on the key structure. It should be possible to build the query based on this.

### Sanity Studio

#### CORS origins

You will need to set your localhost and published domains as trusted in your project API settings. See [Access Your Data (CORS)](https://www.sanity.io/docs/cors) for more information. This will enable your client-side to make requests to the API. The authentication works by passing on browser credentials (cookie token) which get set when you log into the studio in the browser.

#### Preview Pane

You will need to setup the preview pane in your Sanity Studio. You should familiarise yourself with their desk structure builder.

Some helpful code is provided in the resources folder in this projects [Github repository](https://github.com/cameronrr/gridsome-sanity-live-preview).

You can also just put a url like `http://localhost:8080/blog/my-first-post/?preview&id=ef4cdfab-5bdd-4264-8940-e075d91d0ddf` in your browser to test as long as you retrieve an id to include.

You can read more about the desk structure builder and concepts here:

- [Introduction to Structure Builder](https://www.sanity.io/docs/structure-builder-introduction)
- [Getting started with Structure Builder](https://www.sanity.io/guides/getting-started-with-structure-builder)
- [Typical use cases for Structure Builder](https://www.sanity.io/docs/structure-builder-typical-use-cases)
- [Preview Anything: Introducing Views and Split Panes](https://www.sanity.io/blog/evolve-authoring-experiences-with-views-and-split-panes)
- [Examples from a Gatsby sample project](https://github.com/sanity-io/gatsby-portfolio-preview-poc/blob/master/studio/README.md) (source material for IframePreview.js)

## Main Issues

### References

- When gridsome-source-sanity populates the Gridsome Data Store, it can handle references
- For example, your `<page-query>` can specify `(resolveReferences: { maxDepth: 5 })`
- Retrieving data directly from the graphql endpoint doesn't offer this kind of feature
- Where is this most problematic? If you want to work with 'raw' data i.e. PortableContent / Blocks
- The current version hasn't solved this yet.

## Todo

Draft Overlay / Stream Updates

- Should be able to setup a listener / watcher, or at worst perhaps a setInterval to refresh the data

## Questions

- Is there a better approach?
- Is there a way to work with the data store client side i.e. add/update data store documents
- Can the resolveReferences sanity function be used? It requires the data store context to resolve references
