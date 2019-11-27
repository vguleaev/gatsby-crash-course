import React from "react"
import { Link, graphql } from "gatsby"
import Layout from "../components/layout"

const BlogPost = ({ data }) => {
  const post = data.markdownRemark
  return (
    <Layout>
      <Link to="/blog"> Go back</Link>
      <h1>{post.frontmatter.title}</h1>
      <small>
        <b>
          Posted by {post.frontmatter.author} on {post.frontmatter.date}
        </b>
      </small>
      <br /> <br />
      <div dangerouslySetInnerHTML={{ __html: post.html }}></div>
    </Layout>
  )
}

export const postQuery = graphql`
  query BlogPostByPath($path: String!) {
    markdownRemark(frontmatter: { path: { eq: $path } }) {
      html
      frontmatter {
        path
        title
        author
        date
      }
    }
  }
`

export default BlogPost
