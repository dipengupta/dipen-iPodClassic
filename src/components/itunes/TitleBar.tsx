import styles from './TitleBar.module.css';

/** The window title bar: faux traffic lights + centered title. */
export default function TitleBar() {
  return (
    <div className={styles.titleBar}>
      <span className={styles.trafficLights} aria-hidden="true">
        <i />
        <i />
        <i />
      </span>
      <span className={styles.title}>Dipen&apos;s iTunes</span>
      <span className={styles.spacer} />
    </div>
  );
}
