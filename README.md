# gridsome-sanity-live-preview

:warning: **Very new, very early, needs work, polish and love.**

## Overview

:warning: **Again, this is rather experimental at the moment. If you can help achieve the goal of this project or have suggestions, awesome.**

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

## Usage

### Gridsome Project

This is implemented as a Vue plugin. Import and use in main.js.

**NOTE: NOT YET ON NPM AT TIME OF WRITING.**

```javascript
// main.js
import GridsomeSanityLivePreview from "gridsome-sanity-live-preview";

export default function (Vue, { head, router, isClient }) {
 Vue.use(GridsomeSanityLivePreview, {
    // your chosen query string to trigger 'preview' processing
    previewParam: 'preview',
    // your graphql endpoint
    graphqlEndpoint: 'https://<projectId>.api.sanity.io/v1/graphql/<dataset>/default',
  })

```

### Component Setup

Currently, the plugin will process the specified pagePreviewQuery to retrieve new data.

- The alias must match the alias used in your `<page-query>`
- The $id variable must be included as below. The id will be passed in from query params.
- Don't expect any 'raw' fields to work. This is the biggest issue with this so far.
  - '\_rawBody' fields are not available. This is gridsome Data Store specific.
  - The format which can be retrieved from sanity api directly is in format 'bodyRaw'.
  - Apart from retrieving raw data, none of the references therein are resolved.

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

Another idea to not require specifying a separate page preview query, is to inspect the $page object, and infer the query based on the key structure. It should be possible to build the query based on this.

### Sanity Studio

You will need to setup the preview pane in your Sanity Studio. Some helpful code is provided in the resources folder.

You can read more about the concepts here:

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

## Questions

- Is there a better approach?
- Is there a way to work with the data store client side i.e. add/update data store documents
- Can the resolveReferences sanity function be used? It requires the data store context to resolve references

```

```
