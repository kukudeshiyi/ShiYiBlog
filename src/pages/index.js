import React from "react";
import classnames from "classnames";
import Layout from "@theme/Layout";
import Link from "@docusaurus/Link";
import useDocusaurusContext from "@docusaurus/useDocusaurusContext";
import useBaseUrl from "@docusaurus/useBaseUrl";
import styles from "./styles.module.css";
import talks from "./homePageTalk";

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
