import * as L from 'leaflet';
import { createMemo, JSX } from 'solid-js';

import { LocationForecasts } from './data/Forecast';
import { keyWidth, meteogram } from './diagrams/Meteogram';
import { ForecastMetadata, forecastOffsets, periodsPerDay, showDate } from './data/ForecastMetadata';
import { sounding } from './diagrams/Sounding';
import { meteogramColumnWidth } from './diagrams/Diagram';

const marginLeft = keyWidth;
const marginTop = 35; // Day height + hour height + 2 (wtf)

const hover = (htmlEl: HTMLElement): HTMLElement => {
  let oldValue: string = 'inherit';
  htmlEl.onmouseenter = () => {
    oldValue = htmlEl.style.backgroundColor;
    htmlEl.style.backgroundColor = 'lightGray';
  }
  htmlEl.onmouseleave = () => htmlEl.style.backgroundColor = oldValue;
  return htmlEl
}

const PeriodSelector = (props: {
  forecastOffsetAndDates: Array<[number, Date]>
  detailedView: JSX.Element
  currentHourOffset: number
  onClick: (hourOffset: number) => void
}): HTMLElement => {
  const flatPeriodSelectors: () => Array<[HTMLElement, number, Date]> =
    createMemo(() => {
      return props.forecastOffsetAndDates
        .map(([hourOffset, date]) => {
          const htmlEl =
            <span
              style={{
                display: 'inline-block',
                cursor: 'pointer',
                border: 'thin solid darkGray',
                width: `${meteogramColumnWidth}px`,
                'line-height': '20px',
                'box-sizing': 'border-box',
                'text-align': 'center',
                'background-color': props.currentHourOffset === hourOffset ? 'lightGray' : 'inherit'
              }}
              onClick={() => props.onClick(hourOffset)}
            >
              {date.toLocaleTimeString(undefined, { hour12: false, hour: '2-digit' })}
            </span>;
          hover(htmlEl);
          return [htmlEl, hourOffset, date]
        });
    })

  const periodSelectorsByDay: () => Array<[Array<[HTMLElement, number]>, Date]> = createMemo(() => {
    const result: Array<[Array<[HTMLElement, number]>, Date]> = [];
    let lastDay: number | null = null;
    flatPeriodSelectors().forEach(([hourSelector, hourOffset, date]) => {
      if (date.getDay() === lastDay) {
        // Same group as previous
        result[result.length - 1][0].push([hourSelector, hourOffset]);
      } else {
        // New group
        result.push([[[hourSelector, hourOffset]], date]);
      }
      lastDay = date.getDay();
    });
    return result
  });

  const periodSelectors: () => Array<HTMLElement> =
    createMemo(() => {
      return periodSelectorsByDay().map(([periods, date]) => {
        const dayEl =
          hover(
            <div
              style={{
                cursor: 'pointer',
                width: `${periods.length * meteogramColumnWidth}px`,
                'text-align': 'center',
                'box-sizing': 'border-box',
                'border-right': 'thin solid darkGray',
                'border-left': 'thin solid darkGray',
                'line-height': '13px'
              }}
              onClick={() => props.onClick(periods[1 /* because we have three periods per day in total in GFS */][1])}
            >
            {
              periods.length === periodsPerDay ?
                date.toLocaleDateString(undefined, { day: '2-digit', month: 'short', weekday: 'short' }) :
                '\xa0'
            }
            </div>
          );
        return <div style={{ display: 'inline-block' }}>
          {dayEl}
          <div style={{ 'text-align': 'right' }}>{periods.map(tuple => tuple[0])}</div>
        </div>;
      });
    })

  const length = () => periodSelectorsByDay().reduce((n, ss) => n + ss[0].length, 0);
  const scrollablePeriodSelector =
    <div style={{ 'overflow-x': 'auto', 'background-color': 'white' }}>
      <div style={{ width: `${length() * meteogramColumnWidth + keyWidth}px` }}>
        <div>{periodSelectors}</div>
        {props.detailedView}
      </div>
    </div>;
  return scrollablePeriodSelector
}

export type DetailedViewType = 'meteogram' | 'sounding'

/**
 * @returns A pair of a reactive element for the detailed view key, and a
 *          reactive element for the detailed view.
 */
const DetailedView = (props: {
  detailedView: DetailedViewType
  locationForecasts: undefined | LocationForecasts
  hourOffset: number
}): [() => JSX.Element, () => JSX.Element] => {

  const fallback: [JSX.Element, JSX.Element] = [<div />, <div />];

  const keyAndView: () => [JSX.Element, JSX.Element] = createMemo<[JSX.Element, JSX.Element]>(() => {
    const locationForecasts = props.locationForecasts;
    if (locationForecasts === undefined) return fallback
    else if (props.detailedView === 'meteogram') {
      return meteogram(locationForecasts)
    }
    else /*if (props.detailedView === 'sounding')*/ {
      const forecast = locationForecasts.atHourOffset(props.hourOffset);
      if (forecast === undefined) return fallback
      else return sounding(forecast, locationForecasts.elevation)
    }
  });
  return [
    () => keyAndView()[0],
    () => keyAndView()[1]
  ]
}

/**
 * @returns Both the period selector shown at the top of the window (which
 *          shows all the available days of forecast, and for each day, the
 *          available periods of forecast), and the one shown at the bottom
 *          of the screen (which shows the current date).
 */
export const PeriodSelectors = (props: {
  forecastMetadata: ForecastMetadata,
  detailedView: DetailedViewType
  locationForecasts: undefined | LocationForecasts,
  hourOffset: number,
  morningOffset: number,
  onHourOffsetChanged: (hourOffset: number) => void,
  onDetailedViewClosed: () => void
}): JSX.Element => {

  const [reactiveKey, reactiveDetailedView] =
    <DetailedView
      detailedView={props.detailedView}
      locationForecasts={props.locationForecasts}
      hourOffset={props.hourOffset}
    />;

  const detailedViewKeyEl = 
    <div style={{ position: 'absolute', width: `${marginLeft}px`, left: 0, top: `${marginTop}px`, 'background-color': 'white' }}>
      {reactiveKey}
    </div>;

  const buttonStyle = { padding: '0.2em', display: 'inline-block', cursor: 'pointer', border: 'thin solid darkGray', 'box-sizing': 'border-box' };
  const currentDayEl =
    <div>
      {
        showDate(
          props.forecastMetadata.dateAtHourOffset(props.hourOffset),
          { showWeekDay: true }
        )
      }
    </div>;

  const previousDayBtn = hover(
    <div
      title='24 hours before'
      style={{ ...buttonStyle }}
      onClick={() => props.onHourOffsetChanged(Math.max(props.hourOffset - 24, 3))}
    >
      -24
    </div>
  );

  // FIXME jump to previous day afternoon if we are on the morning period
  const previousPeriodBtn = hover(
    <div
      title='Previous forecast period'
      style={{ ...buttonStyle }}
      onClick={() => props.onHourOffsetChanged(Math.max(props.hourOffset - 3, 3))}
    >
      -3
    </div>
  );

  // FIXME jump to next day morning if we are on the afternoon period
  const nextPeriodBtn = hover(
    <div
      title='Next forecast period'
      style={{ ...buttonStyle }}
      onClick={() => props.onHourOffsetChanged(Math.min(props.hourOffset + 3, props.forecastMetadata.latest))}
    >
      +3
    </div>
  );

  const nextDayBtn = hover(
    <div
      title='24 hours after'
      style={{ ...buttonStyle }}
      onClick={() => props.onHourOffsetChanged(Math.min(props.hourOffset + 24, props.forecastMetadata.latest))}
    >
      +24
    </div>
  );

  const periodSelectorEl =
    <PeriodSelector
      forecastOffsetAndDates={
        // If there is no selected forecast, infer the available periods from the forecast metadata
        (props.locationForecasts === undefined) ?
          forecastOffsets(props.forecastMetadata.init, props.morningOffset, props.forecastMetadata)
        :
          props.locationForecasts.offsetAndDates()
      }
      currentHourOffset={props.hourOffset}
      detailedView={reactiveDetailedView}
      onClick={(hourOffset: number) => props.onHourOffsetChanged(hourOffset)}
    />;

  const hideDetailedViewBtn =
    <div
      style={{
        ...buttonStyle,
        width: `${marginLeft}px`,
        'flex-shrink': 0,
        'background-color': 'white',
        visibility: (props.locationForecasts !== undefined) ? 'visible' : 'hidden',
        'text-align': 'center'
      }}
      title='Hide'
      onClick={() => props.onDetailedViewClosed()}
    >
      X
    </div>;

  // Period selector and close button for the meteogram
  const periodSelectorContainer =
    <span style={{ position: 'absolute', top: 0, left: 0, 'z-index': 1100, 'max-width': '100%', 'user-select': 'none', cursor: 'default' }}>
      {detailedViewKeyEl}
      <div style={{ display: 'flex', 'align-items': 'flex-start' }}>
        {hideDetailedViewBtn}
        {periodSelectorEl}
      </div>
    </span>;
  L.DomEvent.disableClickPropagation(periodSelectorContainer);
  L.DomEvent.disableScrollPropagation(periodSelectorContainer);

  // Current period
  const currentDayContainer =
    <span style={{ position: 'absolute', bottom: 0, 'margin-left': 'auto', 'margin-right': 'auto', left: 0, right: 0, 'text-align': 'center', 'z-index': 950, 'user-select': 'none', cursor: 'default' }}>
      <div style={{ width: '125px', display: 'inline-block', 'background-color': 'white' }}>
        {currentDayEl}
        <div>
          {previousDayBtn}
          {previousPeriodBtn}
          {nextPeriodBtn}
          {nextDayBtn}
        </div>
      </div>
    </span>;
  L.DomEvent.disableClickPropagation(currentDayContainer);
  L.DomEvent.disableScrollPropagation(currentDayContainer);

  return <>
    {periodSelectorContainer}
    {currentDayContainer}
  </>
};