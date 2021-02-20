import { GraphQLClient } from "graphql-request";
// import resolveReferences from 'gridsome-source-sanity/src/resolveReferences.js'

/**
 * The default config, can be overriden by passing values as options to Vue.use()
 */
const defaultConfig = {
  previewParam: "preview",
  graphqlEndpoint: "",
  debugOutput: false,
  // @todo: allow to only check for preview / handle on certain routes
  // previewRoutes: [],
};

/**
 * Checks whether the 'preview' param is present in the current route params.
 * @param {Object} query The query strings object from the route
 * @param {String} param The string which identifies this as a preview (default is 'preview')
 * @returns {(Boolean|Object)} False if not a preview or id is missing, otherwise { id, isDraft }
 */
const isPreviewRoute = function isPreviewRoute(query, param) {
  if (query[param] === null || (query[param] && query[param] != "false")) {
    return query.id ? { id: query.id, isDraft: query.draft } : false;
  }
  return false;
};

/**
 * Iterate an object and remove any marks
 * Also change from format 'bodyRaw' to '_rawBody'
 * @param {Object} object
 */
const processBlockContent = (object) => {
  if (typeof object === "object") {
    for (var key in object) {
      if (key === "marks") {
        object[key] = [];
      } else if (typeof object[key] === "object") {
        processBlockContent(object[key]);
      }
      if (key.endsWith("Raw") && typeof object[key] === "object") {
        let newKey = key.substring(0, key.length - 3);
        newKey = newKey.charAt(0).toUpperCase() + newKey.slice(1);
        newKey = `_raw${newKey}`;
        object[newKey] = object[key];
        delete object[key];
      }
    }
  }
  return object;
};

/**
 *  Vue plugin using mixin approach.
 *  Will automatically inspect each change of route for a preview param.
 *  If found, it will perform a specified preview query to obtain new / draft data.
 */
class SanityLivePreviewPlugin {
  install(Vue, options) {
    // we only need to deal with previews on the client side
    if (process.isClient) {
      const config = Object.assign(defaultConfig, options);

      if (config.debugOutput) {
        console.log("SanityLivePreviewPlugin - Config", config);
      }

      // must have endpoint supplied or no point proceeding.
      if (!config.graphqlEndpoint) {
        return false;
      }

      Vue.mixin({
        /*  
        mounted() {
            // Still reviewing $page reactivity where initial page-query returns null
            // Maybe we can use { parse } from 'graphql' on the pagePreviewQuery
            // to build the $page object structure for dynamic routes, but it's messy
            // const pagePreviewQueryFields = parse(this.$options.pagePreviewQuery)
        }, 
        */

        beforeRouteEnter(to, from, next) {
          const sanityParams = isPreviewRoute(to.query, config.previewParam);

          if (config.debugOutput) {
            console.log(
              `SanityLivePreviewPlugin - Sanity Params for ${to.path}`,
              sanityParams
            );
          }

          // otherwise, we will instruct the incoming component to retrieve new preview data
          next((vm) => {
            // if this route isn't a preview, or we are missing mandatory data (i.e. an id), then return here
            if (!sanityParams) {
              // we can support dynamic routes being for preview only. go 404 if so and no data
              return vm.$context.previewRouteOnly
                ? vm.$router.replace("/404/")
                : next();
            }

            // if the user specifies the preview query to be run, then we will use that
            // another idea is to generate a query by inspecting the keys on the vm.$page object
            // we will expect only one query variable of $id which we will replace with the query string id
            const sanityPreviewQuery = !vm.$options.pagePreviewQuery
              ? ""
              : vm.$options.pagePreviewQuery
                  // strip start and end whitespace
                  .trim()
                  // insert the id for this document from the query params
                  .replace("$id", `"${sanityParams.id}"`)
                  // convert gridsome format '_rawBody' to sanity format 'bodyRaw"
                  // field names can contain letters, numbers and underscores
                  .replace(
                    /_raw([a-zA-Z0-9_]*)/g,
                    (match, p1) =>
                      `${p1.charAt(0).toLowerCase()}${p1.slice(1)}Raw`
                  )
                  // remove extra spaces
                  .replace(/\s\s+/g, " ")
                  // remove extra line breaks
                  .replace(/[\r\n]+/gm, "");

            if (config.debugOutput) {
              console.log(
                `SanityLivePreviewPlugin - Preview Query for ${to.path}`,
                { previewQuery: sanityPreviewQuery }
              );
            }

            // IMPORTANT: the defined preview query must have aliases which match the <page-query>
            // This is because we will update the $page data using their reactive setters of the same name

            // if there's no query to be made i.e. no user provided, none generated, then return here
            if (!sanityPreviewQuery) {
              if (config.debugOutput) {
                console.warn(
                  "Cannot retrieve query results - no query defined"
                );
              }
              return false;
            }

            // otherwise, try to retrieve the results. this requires the user to be logged into
            // the sanity studio, as it will authenticate by passing their cookie token
            const client = new GraphQLClient(config.graphqlEndpoint, {
              credentials: "include",
              mode: "cors",
            });

            client
              .request(sanityPreviewQuery)
              .then((response) => {
                if (
                  !response ||
                  Object.values(response).every((item) => item === null)
                ) {
                  if (config.debugOutput) {
                    console.log(
                      `SanityLivePreviewPlugin - No data returned for ${to.path}`,
                      "Most likely an authentication issue. Make sure you log in to the studio in your browser."
                    );
                  }
                  return false;
                }

                if (config.debugOutput) {
                  console.log(
                    `SanityLivePreviewPlugin - Query Result for ${to.path}`,
                    response
                  );
                }

                Object.keys(response).forEach((key) => {
                  // if $page has a matching key, we can assign data into it (even if it's current value is null)
                  if (vm.$page.hasOwnProperty(key)) {
                    if (config.debugOutput) {
                      console.log(
                        `SanityLivePreviewPlugin - Applying '${key}' preview data to ${to.path}`
                      );
                    }

                    // do some data processing / management
                    // as a quick/intermediate solution we will just remove marks from the raw content
                    // then, our usual sanitizers shouldn't try to work with unavailable reference data
                    // this function will also set raw content to format '_rawBody' not 'bodyRaw'
                    let processedItem = processBlockContent(response[key]);

                    // use object.assign to keep any top level keys which weren't in the preview
                    vm.$page[key] = Object.assign(
                      vm.$page[key] || {},
                      processedItem
                    );
                  }
                });

                if (config.debugOutput) {
                  console.log(
                    `SanityLivePreviewPlugin - Updated $page data for ${to.path}`,
                    vm.$page
                  );
                }
              })
              .catch((error) => {
                if (config.debugOutput) {
                  console.warn(
                    `SanityLivePreviewPlugin - Error processing query for ${to.path}`,
                    error
                  );
                }
              });
          });
        },

        methods: {},
      });
    }
  }
}

export default new SanityLivePreviewPlugin();
