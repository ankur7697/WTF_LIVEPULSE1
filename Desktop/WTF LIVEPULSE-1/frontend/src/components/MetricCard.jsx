import { AnimatedNumber } from './AnimatedNumber';

function MetricCard({
  label,
  value,
  footer,
  tone = 'ok',
  formatter = (nextValue) => Math.round(nextValue).toLocaleString('en-IN'),
  prefix = '',
  suffix = '',
}) {
  return (
    <div className="kpi-card">
      <div className="kpi-card__label">{label}</div>
      <div className={`kpi-card__value tone-${tone}`}>
        {prefix}
        <AnimatedNumber value={value} formatter={formatter} />
        {suffix}
      </div>
      {footer ? <div className="kpi-card__footer">{footer}</div> : null}
    </div>
  );
}

export {
  MetricCard,
};
