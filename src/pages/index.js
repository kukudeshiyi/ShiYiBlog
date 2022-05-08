import React from "react";
import classnames from "classnames";
import Layout from "@theme/Layout";
import Link from "@docusaurus/Link";
import useDocusaurusContext from "@docusaurus/useDocusaurusContext";
import useBaseUrl from "@docusaurus/useBaseUrl";
import styles from "./styles.module.css";

const talks = [
  {
    title: "今天把博客改了改，也算能放出来见人了",
    author: "ShiYi",
    time: "2022-05-08",
    content:
      "想着也是该搭个博客了，写点东西，不管是工作还是生活，总要记录下嘛！所以博客也分了生活以及技术两块区域，希望可以坚持下去，也算是生活的痕迹。",
    image: "homeTalkImg/homePageImage.jpeg",
  },
].reverse();

function HomeContent() {
  return (
    <main className={classnames(styles.homeMain)}>
      {talks.map(({ title, author, time, content, image }) => {
        const imgUrl = useBaseUrl(image);
        return (
          <section className={classnames(styles.homeContent)}>
            <div className={classnames(styles.homeImageContainer)}>
              <img className={styles.featureImage} src={imgUrl} />
            </div>
            <content className={classnames(styles.homeTextContainer)}>
              <h1 className={classnames(styles.homeTextTitle)}>{title}</h1>
              <p>{`${author},${time}`}</p>
              <p>{content}</p>
            </content>
          </section>
        );
      })}
    </main>
  );
}

function Home() {
  const context = useDocusaurusContext();
  const { siteConfig = {} } = context;
  return (
    <Layout
      title={`Hello from ${siteConfig.title}`}
      description="Description will go into a meta tag in <head />"
    >
      <header className={classnames("hero hero--primary", styles.heroBanner)}>
        <div className="container">
          <h1 className="hero__title">{siteConfig.title}'s Blog</h1>
          <p className="hero__subtitle">{siteConfig.tagline}</p>
        </div>
      </header>
      <HomeContent />
    </Layout>
  );
}

export default Home;
