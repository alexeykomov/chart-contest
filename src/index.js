/*
 * Copyright (c) 2017. Whisp, Alex K.
 */

/**
 * @fileoverview Application entry point.
 * @author alexeykcontact@gmail.com (Alex K)
 */

import { data, Data, DataEntry } from './data.js';

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

    this.state = {
      shouldRender: true,

      mainCanvasWidth: 0,
      mainCanvasHeight: 100,
      legendCanvasWidth: 0,
      legendCanvasHeight: 100,

      lines: [],

      minX: 0,
      maxX: 0,
      minY: 0,
      maxY: 0,

      minXLegend: 0,
      maxXLegend: 0,
      minYLegend: 0,
      maxYLegend: 0,

      colors: [],
    };
    console.log('data[chartNumber]: ', data[chartNumber]);
    this.formatDataEntry(this.state, data[chartNumber]);
    this.setExtremums(this.state);
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

    this.attachEvents();

    this.render();
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
      },
      false
    );

    this.gripLeft.addEventListener('mousedown', e => {}, false);

    this.window.addEventListener('mousedown', e => {}, false);

    document.addEventListener('mousemove', e => {
      if (this.dragTarget) {
        const pageX = e.pageX;
        console.log('pageX: ', pageX);
        const relX =
          pageX >= this.dragRight
            ? this.dragRight
            : pageX <= this.dragLeft
            ? 0
            : pageX - this.dragLeft;
        console.log('relX: ', relX);
        this.state.minX =
          this.state.minXOrig +
          ((this.state.maxXOrig - this.state.minXOrig) * relX) / this.dragWidth;
      }
    });
    document.addEventListener('mouseup', e => {
      this.dragTarget = null;
    });
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
    entry['columns'].forEach(col => {
      lines.push(col.slice(1));
    });
    const colors = Object.keys(/** @type {!Object}*/ (entry['colors'])).map(
      key => entry['colors'][key]
    );

    state.lines = lines;
    state.colors = colors;

    return state;
  }

  /**
   * @param {State} state
   * @return {State} state
   */
  setExtremums(state) {
    const lines = state.lines;
    const minX = lines[0][0];
    const maxX = lines[0][lines[0].length - 1];
    const maxY = lines
      .slice(1)
      .reduce((max, line) => Math.max(max, Math.max(...line)), -Infinity);
    const minY = lines
      .slice(1)
      .reduce((max, line) => Math.min(max, Math.min(...line)), +Infinity);

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
  }

  renderWindow() {
    const state = this.state;
    const lines = state.lines;
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
    this.gripLeft.style = `left:${gripLeftPos}px`;
    const gripRightPos = maxXPixel - this.state.gripWidth;
    this.gripRight.style = `left:${gripRightPos}px`;

    this.glassLeft.style = `width:${gripLeftPos}px`;
    const glassRightPos = gripRightPos + this.state.gripWidth;
    this.glassRight.style = `left:${glassRightPos}px;`;

    const style = `left:${gripLeftPos + this.state.gripWidth}px;width:${this
      .state.legendWidth -
      (gripLeftPos +
        this.state.gripWidth +
        (this.state.legendWidth - gripRightPos))}px`;
    this.window.style = style;
  }

  renderLines(context, lines, lineWidth) {
    const linesNumber = lines.length;
    for (let counter = 1; counter < linesNumber; counter++) {
      context.lineWidth = lineWidth;
      context.beginPath();
      context.strokeStyle = this.state.colors[counter - 1];
      lines[counter].forEach((y, index) => {
        context.lineTo(lines[0][index], y);
      });
      context.stroke();
    }
  }

  checkRender() {
    return this.state.shouldRender;
  }
}

new Array(5).fill(1).forEach((value, counter) => {
  const chart = new Chart(counter);
  window.addEventListener('DOMContentLoaded', () => chart.onLoad(), false);
  window.addEventListener('unload', () => chart.onUnLoad(), false);
});

/** @typedef {{
      shouldRender: boolean,

      lines: !Array.<!Array.<number>>,

      minX: number,
      maxX: number,
      minY: number,
      maxY: number,

      minXLegend: number,
      maxXLegend: number,
      minYLegend: number,
      maxYLegend: number,

      colors: !Array.<string>

}} */
const State = {};
