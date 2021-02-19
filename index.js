import { GraphQLClient } from "graphql-request";
// import resolveReferences from 'gridsome-source-sanity/src/resolveReferences.js'

/**
 * The default config, can be overriden by passing values as options to Vue.use()
 */
const defaultConfig = {
  previewParam: "preview",
  graphqlEndpoint: "",
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

      console.log("SanityLivePreviewPlugin - Config", config);

      // must have endpoint supplied or no point proceeding.
      if (!config.graphqlEndpoint) {
        return false;
      }

      Vue.mixin({
        beforeRouteEnter(to, from, next) {
          const sanityParams = isPreviewRoute(to.query, config.previewParam);

          console.log(
            `SanityLivePreviewPlugin - Sanity Params for ${to.path}`,
            sanityParams
          );

          // if this route isn't a preview, or we are missing mandatory data (i.e. an id), then return here
          if (!sanityParams) {
            return next();
          }

          // otherwise, we will instruct the incoming component to retrieve new preview data
          next(async (vm) => {
            // if the user specifies the preview query to be run, then we will use that
            // another idea is to generate a query by inspecting the keys on the vm.$page object
            // we will expect only one query variable of $id which we will replace with the query string id
            const sanityPreviewQuery = !vm.$options.pagePreviewQuery
              ? ""
              : vm.$options.pagePreviewQuery
                  .trim()
                  .replace("$id", `"${sanityParams.id}"`)
                  .replace(/\s\s+/g, " ")
                  .replace(/[\r\n]+/gm, "");

            console.log(
              `SanityLivePreviewPlugin - Preview Query for ${to.path}`,
              { previewQuery: sanityPreviewQuery }
            );

            // IMPORTANT: the defined preview query must have aliases which match the <page-query>
            // This is because we will update the $page data using their reactive setters of the same name

            // if there's no query to be made i.e. no user provided, none generated, then return here
            if (!sanityPreviewQuery) {
              console.warn("Cannot retrieve query results - no query defined");
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
                  console.log(
                    `SanityLivePreviewPlugin - No data returned for ${to.path}`,
                    "Most likely an authentication issue. Make sure you log in to the studio in your browser."
                  );
                  return false;
                }

                console.log(
                  `SanityLivePreviewPlugin - Query Result for ${to.path}`,
                  response
                );

                // with our response, we can assign it directly into $page using its reactive setters
                // the keys in the response are obejcts for the aliases used in the preview query

                /**
                 * TO REVIEW
                 * Resolving references is usually done automatically at the data store layer
                 * We need to somehow handle this here, or find a way to work with the data store api's from the client
                 * One idea is to tap into the resolveReferences in gridsome-source-sanity
                 * However this requires the context of the data store in order to find the references and return its data
                 *
                 * const resolvedRaw = resolveReferences(response.bodyRaw, 0, 5)
                 *
                 */

                Object.keys(response).forEach((key) => {
                  // if $page has a matching key, we can assign data into it
                  if (vm.$page[key]) {
                    console.log(
                      `SanityLivePreviewPlugin - Applying '${key}' preview data to ${to.path}`
                    );

                    // do some data processing / management
                    // as a quick/intermediate solution we will just remove marks from the raw content
                    // then, our usual sanitizers shouldn't try to work with unavailable reference data
                    // this function will also set raw content to format '_rawBody' not 'bodyRaw'
                    let processedItem = processBlockContent(response[key]);

                    // use object.assign to keep any top level keys which weren't in the preview
                    vm.$page[key] = Object.assign(vm.$page[key], processedItem);
                  }
                });

                console.log(
                  `SanityLivePreviewPlugin - Updated $page data for ${to.path}`,
                  vm.$page
                );
              })
              .catch((error) => {
                console.warn(
                  `SanityLivePreviewPlugin - Error processing query for ${to.path}`,
                  error
                );
              });
          });
        },

        methods: {},
      });
    }
  }
}

export default new SanityLivePreviewPlugin();
