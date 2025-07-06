import type {ReactNode} from 'react';
import clsx from 'clsx';
import Heading from '@theme/Heading';
import styles from './styles.module.css';

type FeatureItem = {
  title: string;
  png: string;
  description: ReactNode;
};

const FeatureList: FeatureItem[] = [
  {
    title: 'Turn Mess into Magic',
    png: '/img/turn-mess-into-magic.png',
    description: (
      <>
          Clean up jumbled, stream-of-consciousness notes with one click.
          Rephrase, refactor, and restructure your ideas without breaking your flow.
      </>
    ),
  },
  {
    title: 'Get the Gist, Fast',
    png: '/img/get-the-gist.png',
    description: (
      <>
          Drowning in a wall of text?
          NoteSmith pulls out the key points from long articles, meeting notes, or
          transcripts so you can get the summary in seconds.
      </>
    ),
  },
  {
    title: 'Editing on Autopilot',
    png: '/img/editing-on-autopilot.png',
    description: (
      <>
          Fix typos, change the tone, or update formatting across your whole vault at once.
          Stop doing the boring, repetitive edits and let your AI sidekick handle it.
      </>
    ),
  },
];

function Feature({title, png, description}: FeatureItem) {
  return (
    <div className={clsx('col col--4')}>
      <div className="text--center">
        <img src={png} alt={title} className={styles.featureSvg} />
      </div>
      <div className="text--center padding-horiz--md">
        <Heading as="h3">{title}</Heading>
        <p>{description}</p>
      </div>
    </div>
  );
}

export default function HomepageFeatures(): ReactNode {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className="row">
          {FeatureList.map((props, idx) => (
            <Feature key={idx} {...props} />
          ))}
        </div>
      </div>
    </section>
  );
}
