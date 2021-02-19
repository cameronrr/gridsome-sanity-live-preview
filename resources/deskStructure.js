/*
{
    "name": "part:@sanity/desk-tool/structure",
    "path": "./plugins/deskStructure/index.js"
}
*/

import S from '@sanity/desk-tool/structure-builder'

import EyeIcon from 'part:@sanity/base/eye-icon'
import IframePreview from './IframePreview.js'

export const getDefaultDocumentNode = ({ schemaType }) => {
  // Define schema types which can have a preview, or simply schemaType for all
  if (schemaType != 'staticPage') {
    return S.document().views([
      S.view.form(),
      S.view.component(IframePreview).icon(EyeIcon).title('Web Preview'),
    ])
  }
}