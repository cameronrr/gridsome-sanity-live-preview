/* eslint-disable react/no-multi-comp, react/no-did-mount-set-state */
import React from 'react'
import PropTypes from 'prop-types'
import styles from './IframePreview.css'

// your base site url. add a trailing slash i.e. '.com/'
const siteUrl = ''

// map schema types to the front end path if different
const pathForType = {
    author: 'about/',
    post: 'blog/',
}

// some types will not be rendered as a template, only inline. 
// this simply returns the path result as the end of the preview url
const ignoreSlug = {
    author: true
}

const assembleProjectUrl = ({displayed, options}) => {
  const path = pathForType[displayed._type] || `${displayed._type}/`
  const slug = ignoreSlug[displayed._type] ? '' : displayed.slug.current
  const id = displayed._id
  const isDraft = id.startsWith('drafts.')
  const queryString = `?preview&id=${id}&isDraft=${isDraft}`
  return `${siteUrl}${path}${slug}${queryString}`
}

class IframePreview extends React.PureComponent {
  static propTypes = {
    document: PropTypes.object // eslint-disable-line react/forbid-prop-types
  }

  static defaultProps = {
    document: null
  }

  render () {
    const {options} = this.props
    const {displayed} = this.props.document
    if (!displayed) {
      return (<div className={styles.componentWrapper}>
        <p>There is no document to preview</p>
      </div>)
    }

    const url = assembleProjectUrl({displayed, options})

    if (!url) {
      return (<div className={styles.componentWrapper}>
        <p>Hmm. Having problems constructing the web front-end URL.</p>
      </div>)
    }

    return (
      <div>
        <p style={{color: 'gray', textAlign: 'center', fontSize: '75%'}}>{url}</p>
        <div className={styles.componentWrapper}>
            <div className={styles.iframeContainer}>
            <iframe src={url} frameBorder={'0'} />
            </div>
        </div>
      </div>
    )
  }
}

export default IframePreview