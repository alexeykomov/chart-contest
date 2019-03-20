/*
 * Copyright (c) 2017. Whisp, Alex K.
 */

/**
 * @fileoverview Application entry point.
 * @author alexeykcontact@gmail.com (Alex K)
 */

import { data, DataEntry } from './data.js';

class Chart {
  /**
   * @param {number} chartNumber
   */
  constructor(chartNumber) {
    /** @type {HTMLCanvasElement} */
    this.mainCanvas = null;
    /** @type {HTMLCanvasElement} */
    this.legendCanvas = null;
    /** @type {HTMLButtonElement} */
    this.buttonOk = null;
    /** @type {HTMLButtonElement} */
    this.buttonCancel = null;

    /** @type {Element} */
    this.gripLeft = null;
    /** @type {Element} */
    this.gripRight = null;
    /** @type {Element} */
    this.glassLeft = null;
    /** @type {Element} */
    this.glassRight = null;
    /** @type {Element} */
    this.window = null;

    /** @type {CanvasRenderingContext2D} */
    this.context = null;
    /** @type {CanvasRenderingContext2D} */
    this.contextLegend = null;
    this.chartNumber = chartNumber;
    this.dpr = window.devicePixelRatio || 1;

    this.onMouseMoveBound = this.onMouseMove.bind(this);
    this.onToggleBound = this.onToggle.bind(this);

    /** @type {Element} */
    this.dragTarget = null;

    this.state = {
      shouldRender: true,

      mainCanvasWidth: 0,
      mainCanvasHeight: 100,
      legendCanvasWidth: 0,
      legendCanvasHeight: 100,

      lines: [],
      enabled: {},

      minX: 0,
      maxX: 0,
      minY: 0,
      maxY: 0,

      minXOrig: 0,
      maxXOrig: 0,
      minYOrig: 0,
      maxYOrig: 0,

      gripLeftPos: 0,
      gripRightPos: 0,

      minXLegend: 0,
      maxXLegend: 0,
      minYLegend: 0,
      maxYLegend: 0,

      colors: [],
    };
    console.log('data[chartNumber]: ', data[chartNumber]);
    this.formatDataEntry(this.state, data[chartNumber]);
    this.setExtremums(this.state);

    /** @type {Array.<Array.<function():void>>} */
    this.taskBatches = [];
  }

  onLoad() {
    this.mainCanvas = /** @type {HTMLCanvasElement} */ (document.querySelectorAll(
      '.main-canvas'
    )[this.chartNumber]);
    this.legendCanvas = /** @type {HTMLCanvasElement}*/ (document.querySelectorAll(
      '.legend-canvas'
    )[this.chartNumber]);
    this.gripLeft = document.querySelectorAll('.grip-left')[this.chartNumber];
    this.gripRight = document.querySelectorAll('.grip-right')[this.chartNumber];
    this.glassLeft = document.querySelectorAll('.glass-left')[this.chartNumber];
    this.glassRight = document.querySelectorAll('.glass-right')[
      this.chartNumber
    ];
    this.window = document.querySelectorAll('.window')[this.chartNumber];

    this.context = this.setupCanvas(this.mainCanvas);
    this.contextLegend = this.setupCanvas(this.legendCanvas);

    this.state.mainCanvasWidth = this.mainCanvas.width;
    this.state.mainCanvasHeight = this.mainCanvas.height;
    this.state.legendCanvasWidth = this.legendCanvas.width;
    this.state.legendCanvasHeight = this.legendCanvas.height;

    this.state.legendWidth = this.state.legendCanvasWidth / this.dpr;
    this.state.gripWidth = +/\d+/.exec(
      window.getComputedStyle(this.gripLeft)['width']
    )[0];

    this.createButtons(this.state);

    this.attachEvents();

    this.render();
  }

  /** @param {State} state */
  createButtons(state) {
    const buttonCont = document.querySelectorAll('.button-cont')[
      this.chartNumber
    ];
    this.state.names.forEach((name, index) => {
      const button = document.createElement('button');
      button.classList.add('button');
      const circle = document.createElement('span');
      circle.classList.add('circle');
      circle.style.background = serializeColor(state.colors[index]);
      circle.innerText = '\u2714';
      const label = document.createTextNode(name);
      button.appendChild(circle);
      button.appendChild(label);
      buttonCont.appendChild(button);
      button.dataset['chartId'] = String(index);

      button.addEventListener('click', this.onToggleBound, false);

      this.renderButtons(this.state);
    });
  }

  onToggle(e) {
    const button = e.currentTarget;
    const chartId = +button.dataset['chartId'];

    const { minY, maxY } = this.state;

    console.log('minY: ', minY);
    console.log('maxY: ', maxY);
    console.log('this.state.enabled: ', this.state.enabled);

    const enabling = !this.state.enabled[chartId];
    this.state.enabled[chartId] = !this.state.enabled[chartId];

    const { minY: newMinY, maxY: newMaxY } = this.findExtremums(this.state);
    console.log('newMinY: ', newMinY);
    console.log('newMaxY: ', newMaxY);

    let steps = 0;
    const deltaMinY = newMinY - minY;
    const deltaMaxY = newMaxY - maxY;
    const STEPS_QUANTITY = 10;
    const deltaOpacity = (enabling ? +1 : -1) / STEPS_QUANTITY;
    this.taskBatches.push(
      new Array(STEPS_QUANTITY).fill(1).map(v => () => {
        if (steps === STEPS_QUANTITY) {
          return;
        }
        if (steps < STEPS_QUANTITY - 1) {
          this.state.minY = this.state.minY + deltaMinY / STEPS_QUANTITY;
          this.state.maxY = this.state.maxY + deltaMaxY / STEPS_QUANTITY;
          this.state.colors[chartId].a =
            this.state.colors[chartId].a + deltaOpacity;
        } else {
          this.state.minY = newMinY;
          this.state.maxY = newMaxY;
          this.state.colors[chartId].a = enabling ? 1 : 0;
        }
        steps++;
      })
    );

    this.renderButtons(this.state);
  }

  attachEvents() {
    this.gripLeft.addEventListener(
      'mousedown',
      e => {
        this.dragTarget = e.currentTarget;
        let rect = this.legendCanvas.getBoundingClientRect();
        this.dragLeft = rect.left;
        this.dragRight = rect.right;
        this.dragWidth = rect.width;
        e.preventDefault();
      },
      false
    );
    this.gripRight.addEventListener(
      'mousedown',
      e => {
        this.dragTarget = e.currentTarget;
        let rect = this.legendCanvas.getBoundingClientRect();
        this.dragLeft = rect.left;
        this.dragRight = rect.right;
        this.dragWidth = rect.width;
        e.preventDefault();
      },
      false
    );
    this.window.addEventListener(
      'mousedown',
      e => {
        this.dragTarget = e.currentTarget;
        let rect = this.legendCanvas.getBoundingClientRect();
        this.dragLeft = rect.left;
        this.dragRight = rect.right;
        this.dragWidth = rect.width;

        const windowRect = this.window.getBoundingClientRect();
        this.windowRectWidth = windowRect.width;
        this.draggingOffset = e.pageX - windowRect.left;
      },
      false
    );
    document.addEventListener('mousemove', this.onMouseMoveBound);
    document.addEventListener('mouseup', e => {
      this.dragTarget = null;
    });
  }

  onMouseMove(e) {
    if (!this.dragTarget) {
      return;
    }

    const { gripLeftPos, gripRightPos } = this.calculateGripPos(this.state);

    if (this.dragTarget === this.gripLeft) {
      const relX = e.pageX - this.dragLeft;
      const relXBound =
        relX >= gripRightPos - this.state.gripWidth
          ? gripRightPos - this.state.gripWidth
          : relX <= 0
          ? 0
          : relX;
      console.log('relX: ', relXBound);
      this.state.minX =
        this.state.minXOrig +
        ((this.state.maxXOrig - this.state.minXOrig) * relXBound) /
          this.dragWidth;

      this.animateWindowDelayed();
      return;
    }
    if (this.dragTarget === this.gripRight) {
      const relX = e.pageX - this.dragLeft;
      const relXBound =
        relX >= this.dragWidth
          ? this.dragWidth
          : relX <= gripLeftPos + 2 * this.state.gripWidth
          ? gripLeftPos + 2 * this.state.gripWidth
          : relX;
      console.log('relX: ', relX);
      this.state.maxX =
        this.state.minXOrig +
        ((this.state.maxXOrig - this.state.minXOrig) * relXBound) /
          this.dragWidth;
      this.animateWindowDelayed();
      return;
    }
    if (this.dragTarget === this.window) {
      const relX =
        e.pageX - this.draggingOffset - this.dragLeft - this.state.gripWidth;
      const relXBound =
        relX >= this.dragWidth - this.windowRectWidth - 2 * this.state.gripWidth
          ? this.dragWidth - this.windowRectWidth - 2 * this.state.gripWidth
          : relX <= 0
          ? 0
          : relX;
      console.log('relX: ', relX);

      this.state.minX =
        this.state.minXOrig +
        ((this.state.maxXOrig - this.state.minXOrig) * relXBound) /
          this.dragWidth;
      this.state.maxX =
        this.state.minXOrig +
        ((this.state.maxXOrig - this.state.minXOrig) *
          (relXBound + this.windowRectWidth + 2 * this.state.gripWidth)) /
          this.dragWidth;
      this.animateWindowDelayed();
      return;
    }
  }

  animateWindowDelayed() {
    clearTimeout(this.timeout);
    this.timeout = setTimeout(() => {
      this.animateWindow();
    }, 200);
  }

  animateWindow() {
    let steps = 0;
    const {minY: newMinY, maxY: newMaxY} = this.findYExtremumsInInterval(
        this.state,
        this.state.minX,
        this.state.maxX
    );
    console.log('newMinY: ', newMinY);
    console.log('newMaxY: ', newMaxY);
    const deltaMinY = newMinY - this.state.minY;
    const deltaMaxY = newMaxY - this.state.maxY;
    const STEPS_QUANTITY = 10;
    this.taskBatches.push(
        new Array(STEPS_QUANTITY).fill(1).map(v => () => {
          if (steps === STEPS_QUANTITY) {
            return;
          }
          if (steps < STEPS_QUANTITY - 1) {
            this.state.minY = this.state.minY + deltaMinY / STEPS_QUANTITY;
            this.state.maxY = this.state.maxY + deltaMaxY / STEPS_QUANTITY;
          } else {
            this.state.minY = newMinY;
            this.state.maxY = newMaxY;
          }
          steps++;
        })
    );
  }

  /**
   * @param {HTMLCanvasElement} canvasEl
   * @return {CanvasRenderingContext2D}
   */
  setupCanvas(canvasEl) {
    const context = /** @type {CanvasRenderingContext2D} */ (canvasEl.getContext(
      '2d'
    ));
    let computedStyle = window.getComputedStyle(canvasEl);
    canvasEl.width = +/\d+/.exec(computedStyle['width'])[0] * this.dpr;
    canvasEl.height = +/\d+/.exec(computedStyle['height'])[0] * this.dpr;
    context.scale(this.dpr, this.dpr);
    return context;
  }

  setupWindow() {}

  onUnLoad() {}

  /**
   * @param {State} state
   * @param {DataEntry} entry
   * @return {State}
   */
  formatDataEntry(state, entry) {
    const lines = [];
    entry['columns'].forEach((col, index) => {
      lines.push(col.slice(1));
      if (index > 0) {
        state.enabled[index - 1] = true;
      }
    });
    const colors = Object.keys(/** @type {!Object}*/ (entry['colors'])).map(
      key => parseHexColorToRgb(entry['colors'][key])
    );
    const names = Object.keys(/** @type {!Object} */ (entry['names'])).map(
      key => entry['names'][key]
    );

    state.lines = lines;
    state.colors = colors;
    state.names = names;

    return state;
  }

  /**
   * @param {State} state
   * @return {State} state
   */
  setExtremums(state) {
    const { minX, maxX, maxY, minY } = this.findExtremums(state);

    state.minX = minX;
    state.maxX = maxX;
    state.minY = minY;
    state.maxY = maxY;

    state.minXOrig = minX;
    state.maxXOrig = maxX;
    state.minYOrig = minY;
    state.maxYOrig = maxY;

    return state;
  }

  /**
   * @param {State} state
   * @return {Extremums}
   */
  findExtremums(state) {
    const lines = state.lines;
    const minX = lines[0][0];
    const maxX = lines[0][lines[0].length - 1];
    const maxY = lines
      .slice(1)
      .filter((line, index) => state.enabled[index])
      .reduce((max, line) => Math.max(max, Math.max(...line)), -Infinity);
    const minY = lines
      .slice(1)
      .filter((line, index) => state.enabled[index])
      .reduce((max, line) => Math.min(max, Math.min(...line)), +Infinity);
    return { minX, maxX, maxY, minY };
  }

  /**
   * @param {State} state
   * @param {number} minX
   * @param {number} maxX
   * @return {{minY: number, maxY: number}}
   */
  findYExtremumsInInterval(state, minX, maxX) {
    const lines = state.lines;
    const xs = lines[0];
    let searchStartIndex = 0;
    for (let counter = 0; counter < xs.length; counter++) {
      console.log('minX: ', minX);
      console.log('xs[counter]: ', xs[counter]);
      console.log('counter: ', counter);
      if (xs[counter] >= minX && counter - 1 >= 0) {
        searchStartIndex = counter - 1;
        break;
      }
    }
        console.log('searchStartIndex: ', searchStartIndex);
    let searchEndIndex = xs.length - 1;
    for (let counter = xs.length - 1; counter >= 0; counter--) {
      if (xs[counter] <= maxX   && counter + 1 < xs.length - 1) {
        searchEndIndex = counter + 1;
        break;
      }
    }
        console.log('searchEndIndex: ', searchEndIndex);
    const maxY = lines
      .slice(1)
      .filter((line, index) => state.enabled[index])
      .reduce(
        (max, line) =>
          Math.max(
            max,
            Math.max(...line.slice(searchStartIndex, searchEndIndex + 1))
          ),
        -Infinity
      );
    const minY = lines
      .slice(1)
      .filter((line, index) => state.enabled[index])
      .reduce(
        (max, line) =>
          Math.min(
            max,
            Math.min(...line.slice(searchStartIndex, searchEndIndex + 1))
          ),
        +Infinity
      );
    return { maxY, minY };
  }

  /**
   * @param {State} state
   * @param {number} canvasWidth
   * @param {number} canvasHeight
   * @param {boolean} useOrig
   * @return {!Array.<!Array.<number>>}
   */
  normalizeEntry(state, canvasWidth, canvasHeight, useOrig) {
    const lines = state.lines;
    const minX = useOrig ? state.minXOrig : state.minX;
    const maxX = useOrig ? state.maxXOrig : state.maxX;
    const maxY = useOrig ? state.maxYOrig : state.maxY;
    const minY = useOrig ? state.minYOrig : state.minY;

    return lines.map((line, index) => {
      if (index === 0) {
        return line.map(
          v =>
            this.normalizeValue(v, minX, maxX, 0, canvasWidth, false) / this.dpr
        );
      }
      return line.map(
        v =>
          this.normalizeValue(v, minY, maxY, 0, canvasHeight, true) / this.dpr
      );
    });
  }

  /**
   * @param {number} value
   * @param {number} minValue
   * @param {number} maxValue
   * @param {number} screenMin
   * @param {number} screenMax
   * @param {boolean} isY
   * @return {number}
   * */
  normalizeValue(value, minValue, maxValue, screenMin, screenMax, isY) {
    const pixel = (maxValue - minValue) / (screenMax - screenMin);
    const coordinate = (value - minValue) / pixel;
    return isY ? screenMax - coordinate : coordinate;
  }

  render() {
    requestAnimationFrame(() => {
      //console.time('render');
        this.taskBatches.forEach(batch => {
          if (batch.length) {
            batch.pop()();
          }
        });
        this.taskBatches = this.taskBatches.filter(batch => !!batch.length);


      this.context.clearRect(
        0,
        0,
        this.state.mainCanvasWidth,
        this.state.mainCanvasHeight
      );

      const normalizedLinesMain = this.normalizeEntry(
        this.state,
        this.state.mainCanvasWidth,
        this.state.mainCanvasHeight,
        false
      );
      this.renderLines(this.context, normalizedLinesMain, 2);

      this.contextLegend.clearRect(
        0,
        0,
        this.state.legendCanvasWidth,
        this.state.legendCanvasHeight
      );

      const normalizedLinesLegend = this.normalizeEntry(
        this.state,
        this.state.legendCanvasWidth,
        this.state.legendCanvasHeight,
        true
      );
      this.renderLines(this.contextLegend, normalizedLinesLegend, 1);

      this.renderWindow();

      if (this.checkRender()) {
        this.render();
      }
      this.state.shouldRender = true;
    });
    //console.timeEnd('render');
  }

  renderButtons(state) {}

  renderWindow() {
    const { gripLeftPos, gripRightPos } = this.calculateGripPos(this.state);

    const glassRightPos = gripRightPos + this.state.gripWidth;

    this.gripLeft.style = `left:${gripLeftPos}px`;
    this.gripRight.style = `left:${gripRightPos}px`;

    this.glassLeft.style = `width:${gripLeftPos}px`;
    this.glassRight.style = `left:${glassRightPos}px;`;

    this.window.style = `left:${gripLeftPos +
      this.state.gripWidth}px;width:${this.state.legendWidth -
      (gripLeftPos +
        this.state.gripWidth +
        (this.state.legendWidth - gripRightPos))}px`;
  }

  /**
   * @param {State} state
   * @return {State} state
   * */
  calculateGripPos(state) {
    const minX = state.minX;

    const maxX = state.maxX;
    const maxY = state.maxY;
    const minY = state.minY;

    const minXPixel = this.normalizeValue(
      minX,
      this.state.minXOrig,
      this.state.maxXOrig,
      0,
      this.state.legendWidth,
      false
    );
    const maxXPixel = this.normalizeValue(
      maxX,
      this.state.minXOrig,
      this.state.maxXOrig,
      0,
      this.state.legendWidth,
      false
    );

    const gripLeftPos = minXPixel;
    const gripRightPos = maxXPixel - this.state.gripWidth;

    state.gripLeftPos = gripLeftPos;
    state.gripRightPos = gripRightPos;

    return state;
  }

  renderLines(context, lines, lineWidth) {
    const linesNumber = lines.length;
    for (let counter = 1; counter < linesNumber; counter++) {
      context.lineWidth = lineWidth;
      context.beginPath();
      context.strokeStyle = serializeColor(this.state.colors[counter - 1]);
      lines[counter].forEach((y, index) => {
        context.lineTo(lines[0][index], y);
      });
      context.stroke();
    }
  }

  checkRender() {
    return true;
  }
}

new Array(5).fill(1).forEach((value, counter) => {
  const chart = new Chart(counter);
  window.addEventListener('DOMContentLoaded', () => chart.onLoad(), false);
  window.addEventListener('unload', () => chart.onUnLoad(), false);
});

const parseHexColorToRgb = hex => {
  const withoutHash = hex.slice(1);
  const rgba = {
    r: parseInt(withoutHash.slice(0, 2), 16),
    g: parseInt(withoutHash.slice(2, 4), 16),
    b: parseInt(withoutHash.slice(4), 16),
    a: 1,
  };
  console.log('rgba: ', rgba);
  return rgba;
};

const serializeColor = ({ r, g, b, a }) => {
  return `rgba(${r},${g},${b},${a})`;
};

/** @typedef {{
      shouldRender: boolean,

      lines: !Array.<!Array.<number>>,

      minX: number,
      maxX: number,
      minY: number,
      maxY: number,

      minXOrig: number,
      maxXOrig: number,
      minYOrig: number,
      maxYOrig: number,

      gripLeftPos: number,
      gripRightPos: number,

      minXLegend: number,
      maxXLegend: number,
      minYLegend: number,
      maxYLegend: number,

      colors: !Array.<string>,
      names: !Array.<string>

}} */
const State = {};

/**
 * @typedef {{minX: number, maxX: number, minY: number, maxY: number}}
 * */
const Extremums = {};
