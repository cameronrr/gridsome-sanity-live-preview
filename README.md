# gridsome-sanity-live-preview

:warning: **Very new, very early, needs work, polish and love.**

## Overview

**Appreciate any help or suggestions to mold this into a worthy package!**

This plugin aims to provide live previews for Gridsome projects which are using Sanity Studio as a data source.

It works with the Sanity graphql api.

### Why

When working with a draft or publishing an updated document in Sanity Studio, you would usually need to rebuild the whole project to see the effect of the changes. Of course if you are a developer you could enable watchMode on a local project. However for an end user who is simply a content editor in the Studio, a live preview is an extremely useful tool to understand the effect of their changes before a proper publish / deploy / rebuild of the site takes place.

Further, Sanity Studio supports custom 'live preview' split panes, so you can see the preview without leaving the editor. It essentially works by rendering an iframe. The url we give to the iframe is one which will trigger the client side of our gridsome application to retrieve the latest information, and update the reactive data layer.

### How

The concept is simple:

- The page loads client side and checks for the presence of a query string i.e. 'preview'.
- The plugin will then retrieve or attempt to generate a graphql preview query to Sanity Studio.
- Authentication occurs by passing the users cookie/token from their logged in Studio session.
- When the data is returned, then the components $page is updated using the built in reactive setter.

## Status

The documentation and notes here are very early, they will be improved over time as the package improves and as it is used by more people.

### What is working

- For simple data types and image assets, the current approach does create a preview as expected.
- For block content, I had issues with references in marks. v0.1.6 implemented a halfway workaround.
  - The marks are stripped and instead any children content (i.e. text) is just rendered plainly.
  - Annotations work fine, so headings and other basic markup still shows in the preview as expected!
- Initially, only non-dynamic routes which already existed in the build were able to be updated.
- Around v0.1.10, there is support for dynamic client-side 'preview only' routes, to preview brand new docs.
  - There is even support to utilise the same template, no separate preview components needed.

### What needs attention

#### A loading indicator

- As soon as the preview query is matched, we should show a loading indicator while the data is retrieved.
- It will be a nicer experience for the user to confirm what's happening and that the preview is incoming.

#### Actual 'live' updates

- It would be cool to implement a listener or an interval for retrieving updates while the page stays open.
- Currently, it's a small issue, you can just reload. In Sanity, toggle between 'Editor' and 'Web Preview' does a reload anyway.

#### Sanity References

- Data returned from Sanity usually contains references.
- Gridsome at the data store level does a good job resolving these.
- We need a way to resolve these when querying the Sanity graphql api directly.
- The main issue is with Blocks (block content / portable content) and marks.
- This will allow in particular serializers on block content to do their thing.

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
    graphqlEndpoint: 'https://<projectId>.api.sanity.io/v1/graphql/<dataset>/default',
  })

```

You can run `sanity graphql list` in your sanity project directory to see this. Note this plugin is designed for the graphql api, not for the standard groq.

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

And for reference, the corresponding `<page-query>` which uses the data store rather than sanity api directly:

```vue
<page-query>
query Post($id: ID!) {
  post: sanityPost(id: $id) {
    title
    slug {
      current
    }
    publishedAt
    mainImage {
      altText
      asset {
        url
      }
    }
    excerpt
    _rawBody(resolveReferences: { maxDepth: 5 })
  }
}
</page-query>
```

- An alias is required and it must match the alias used in your `<page-query>` (i.e. `post: ` in the example).
- The type must be without 'sanity' prefix i.e. 'sanityPost' will be queried as 'Post' for the preview.
- The $id variable must be included. The id will be passed in from the query params.
- There is currently limitations for 'raw' fields. See above at status for more information. But note that:
  - '\_rawBody' fields are not available from sanity. This is gridsome Data Store specific.
  - The format which can be retrieved from sanity api directly for previews is in the format 'bodyRaw'.
  - None of the references are being resolved, this can affect block marks. Marks are currently stripped.

#### Possible Improvement

Another idea to not require specifying a separate page preview query, is to inspect the $page object, and infer the query based on the key structure. It might be possible to build the query based on this, at least for basic queries with some assumptions. Specifying the query explicitly on the component would be safer especially for more advanced queries, even though it is additional maintenance alongside the `<page-query>`.

A downside to this approach is that there won't be any data to inspect for brand new docs, so it is unlikely this will be looked at. And it just adds opportunities for failure which aren't really needed. So just define your preview query explicitly on the component and things will go smoothly.

### Dynamic Routing

- If you only want to show previews for updates to existing pages, there is nothing more to do in Gridsome.
- If however, you want to be able to show content for a brand new Sanity document which isn't in the production build, you need to enable dynamic routing.

```javascript
// gridsome.server.js - create dynamic routes to support client side 'preview' pages
module.exports = function (api) {
  api.createPages(({ createPage }) => {
    createPage({
      path: "/blog/:id",
      component: "./src/templates/SanityPost.vue",
      context: {
        previewRouteOnly: true,
      },
      queryVariables: {
        id: "",
      },
    });
  });
};
```

#### Dynamic only for previews

If you only want this dynamic route for previews, you can set `context: { previewRouteOnly: true }` in which case, the plugin will replace the route with /404/ if the preview query or preview id is not found.

#### Existing Component / Template

We use the createPages approach to create a 'shell' with which to assign our client side preview data into. You can reuse your existing templates i.e. `templates/SanityPost.vue` with the following topics in mind.

#### Page id

When the dynamic template page is rendered on the server (i.e. `blog/_id.html`) it will complain if it cannot execute the `<page-query` which is defined for actual routes of the same template. This is because we are using the same template for proper `<page-query>` exection for known routes, as well as creating it as an empty shell for preview routes.

- The solution is to include `queryVariables: { id: "" }` in `createPage()` which will just cause the data to return as null, which is fine for our needs. As long as you implement proper data validation (keep reading).

#### Data Validation

If you use overlayDrafts in development mode, you might have noticed that Sanity doesn't do full validations on draft documents. This can result in your template failing, if it tries to reference a null or undefined value. And so it is good practice to validate the data you are trying to use or display. Especially if you want to use the same template for server and client preview page generation.

- In your components `<script>` tag, the optional chaining operator is useful (assuming you have Node v14 or higher) to validate the paths exist: i.e. `this.$page.post?.title` and `this.$page.post?.mainImage?.asset.url`.
- Until Webpack v5 is in place (think Vue 3 with Gridsome 1.0), we cannot use this approach inside `<template>`. Instead, we can use logical AND operator `&&` like this: `{{ $page.post && $page.post.title }}` to return the right most argument if the data exists. In this case, a string.
- If a component has no children and only needs to reference values by binding (i.e. an img tag) then a v-for on the tag will work. This is useful to do once if you have multiple bindings i.e. 'src' and'alt' for an img and don't handle some kind of fallback or default image. This does not seem to stop evaluation of child components or inner html, so you cannot just put a v-for on `<template>` or it's first child. Example: `<img v-if="$page.post && $page.post.mainImage" :src="$page.post.mainImage.asset.url">`.

#### Redirects

If you implemented dynamic routing, Gridsome can [output a redirects array](https://gridsome.org/docs/dynamic-routing/#generating-rewrite-rules) after building to assist with implementation on your hosting.

```javascript
[{ from: "/blog/:id", to: "/blog/_id.html", status: 200 }];
```

Here is an automated example for creating or updating a Netlify `_redirects` file.

```javascript
// gridsome.server.js
module.exports = function (api) {
  api.afterBuild(({ redirects }) => {
    if (redirects) {
      let rules = [];
      for (const rule of redirects) {
        rules.push(`${rule.from}\t${rule.to}\t${rule.status}`);
      }
      fs.appendFileSync("./dist/_redirects", rules.join("\n"));
    }
  });
};
```

### Sanity Studio

#### CORS origins

You will need to set your localhost and published domains as trusted in your project API settings. See [Access Your Data (CORS)](https://www.sanity.io/docs/cors) for more information. This will enable your client-side to make requests to the API. The authentication works by passing on browser credentials (cookie token) which get set when you log into the studio in the browser.

#### Preview Pane

You will need to setup the preview pane in your Sanity Studio. You should familiarise yourself with their desk structure builder.

Some helpful code is provided in this projects [resources](https://github.com/cameronrr/gridsome-sanity-live-preview/tree/main/resources) folder.

You can also just put a url like `http://localhost:8080/blog/my-first-post/?preview&id=ef4cdfab-5bdd-4264-8940-e075d91d0ddf` in your browser to test as long as you use a valid id for your project in the url.

You can read more about the desk structure builder and concepts here:

- [Introduction to Structure Builder](https://www.sanity.io/docs/structure-builder-introduction)
- [Getting started with Structure Builder](https://www.sanity.io/guides/getting-started-with-structure-builder)
- [Typical use cases for Structure Builder](https://www.sanity.io/docs/structure-builder-typical-use-cases)
- [Preview Anything: Introducing Views and Split Panes](https://www.sanity.io/blog/evolve-authoring-experiences-with-views-and-split-panes)
- [Examples from a Gatsby sample project](https://github.com/sanity-io/gatsby-portfolio-preview-poc/blob/master/studio/README.md) (source material for IframePreview.js)

## Main Issues

### References

- When gridsome-source-sanity populates the Gridsome Data Store, it can handle references.
- For example, your `<page-query>` can specify `(resolveReferences: { maxDepth: 5 })`.
- Retrieving data directly from the graphql endpoint doesn't offer this kind of feature.
- Where is this most problematic? If you want to work with 'raw' data i.e. PortableContent / Blocks.
- The current version implements a workaround to just ignore marks and render plain text.

## Questions

- Is there a better approach?
- Is there a way to work with the data store client side i.e. add/update data store documents.
- Can the resolveReferences sanity function be used? It requires the data store context to resolve references.
