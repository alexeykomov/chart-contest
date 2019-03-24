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
    this.onTouchMoveBound = this.onTouchMove.bind(this);
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
      initialRender: true,
    };
    this.formatDataEntry(this.state, data[chartNumber]);
    this.setExtremums(this.state);

    /** @type {Map.<AnimationTypes, Array.<function():void>>} */
    this.taskBatches = new Map();
    this.renderInProgress = false;
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
    this.dayNightSwitch = document.querySelector('.day-night-switch');

    this.mainCanvas.style.height = window.getComputedStyle(this.mainCanvas)['width'];
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
      circle.innerHTML =
        '<svg xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:cc="http://creativecommons.org/ns#" xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" xmlns:svg="http://www.w3.org/2000/svg" xmlns="http://www.w3.org/2000/svg" xmlns:sodipodi="http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd" xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape" version="1.1" x="0px" y="0px" viewBox="0 0 100 125"><g transform="translate(0,-952.36218)"><path style="text-indent:0;text-transform:none;direction:ltr;block-progression:tb;baseline-shift:baseline;color:#ffffff;enable-background:accumulate;" d="m 65.3124,984.14343 -21.5937,22.46867 -9.4063,-8.68742 -6.8124,7.34372 13,12 3.625,3.3125 3.375,-3.5313 25,-25.99992 -7.1876,-6.90625 z" fill="#ffffff" fill-opacity="1" stroke="none" marker="none" visibility="visible" display="inline" overflow="visible"/></g></svg>';
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

    const enabling = !this.state.enabled[chartId];
    this.state.enabled[chartId] = !this.state.enabled[chartId];

    const { minY: newMinY, maxY: newMaxY } = this.findYExtremumsInInterval(
      this.state,
      this.state.minX,
      this.state.maxX
    );

    let steps = 0;
    const deltaMinY = newMinY - minY;
    const deltaMaxY = newMaxY - maxY;
    const STEPS_QUANTITY = 10;
    const deltaOpacity = (enabling ? +1 : -1) / STEPS_QUANTITY;
    console.log('start timestamp: ', performance.now());
    let prevTimestamp = performance.now();
    this.taskBatches.set(
      AnimationTypes.Toggle,
      new Array(STEPS_QUANTITY).fill(1).map(v => timestamp => {
        const stepsToAdd = Math.ceil(Math.floor(timestamp - prevTimestamp) / 17) || 1;
        prevTimestamp = timestamp;
        console.log('stepsToAdd: ', stepsToAdd);
        steps += stepsToAdd;

        if (steps < STEPS_QUANTITY) {
          this.state.minY = this.state.minY + deltaMinY / STEPS_QUANTITY * stepsToAdd;
          this.state.maxY = this.state.maxY + deltaMaxY / STEPS_QUANTITY * stepsToAdd;
          this.state.colors[chartId].a =
          this.state.colors[chartId].a + deltaOpacity * stepsToAdd;
          return;
        }

        this.state.minY = newMinY;
        this.state.maxY = newMaxY;
        this.state.colors[chartId].a = enabling ? 1 : 0;
        this.taskBatches.set(AnimationTypes.Toggle, []);
      })
    );
    this.render();
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
    this.gripLeft.addEventListener(
      'touchstart',
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
    this.gripRight.addEventListener(
      'touchstart',
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
        e.preventDefault();
      },
      false
    );
    this.window.addEventListener(
      'touchstart',
      e => {
        this.dragTarget = e.currentTarget;
        let rect = this.legendCanvas.getBoundingClientRect();
        this.dragLeft = rect.left;
        this.dragRight = rect.right;
        this.dragWidth = rect.width;

        const windowRect = this.window.getBoundingClientRect();
        this.windowRectWidth = windowRect.width;
        this.draggingOffset = e.changedTouches[0].pageX - windowRect.left;
        e.preventDefault();
      },
      false
    );
    document.addEventListener('mousemove', this.onMouseMoveBound);
    document.addEventListener('touchmove', this.onTouchMoveBound);
    document.addEventListener('mouseup', e => {
      this.dragTarget = null;
    });
    document.addEventListener('touchend', e => {
      this.dragTarget = null;
    });
    this.dayNightSwitch.addEventListener('click', e => {
      document.documentElement.classList.toggle('night');
    })
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
      this.state.minX =
        this.state.minXOrig +
        ((this.state.maxXOrig - this.state.minXOrig) * relXBound) /
          this.dragWidth;

      this.animateWindow();
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
      this.state.maxX =
        this.state.minXOrig +
        ((this.state.maxXOrig - this.state.minXOrig) * relXBound) /
          this.dragWidth;
      this.animateWindow();
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
      this.state.minX =
        this.state.minXOrig +
        ((this.state.maxXOrig - this.state.minXOrig) * relXBound) /
          this.dragWidth;
      this.state.maxX =
        this.state.minXOrig +
        ((this.state.maxXOrig - this.state.minXOrig) *
          (relXBound + this.windowRectWidth + 2 * this.state.gripWidth)) /
          this.dragWidth;
      this.animateWindow();
      return;
    }
  }

  /** @param {TouchEvent} e */
  onTouchMove(e) {
    this.onMouseMoveBound(e.changedTouches[0]);
    e.preventDefault();
  }

  animateWindow() {
    let steps = 0;
    const { minY: newMinY, maxY: newMaxY } = this.findYExtremumsInInterval(
      this.state,
      this.state.minX,
      this.state.maxX
    );
    const deltaMinY = newMinY - this.state.minY;
    const deltaMaxY = newMaxY - this.state.maxY;
    const STEPS_QUANTITY = 10;
    let prevTimestamp = performance.now();
    this.taskBatches.set(
      AnimationTypes.Drag,
      new Array(STEPS_QUANTITY).fill(1).map(v => (timestamp) => {
        const stepsToAdd = Math.ceil(Math.floor(timestamp - prevTimestamp) / 17);
        const stepsToAddSafe = stepsToAdd <= 0 ? 1 : stepsToAdd;
        prevTimestamp = timestamp;
        console.log('stepsToAdd: ', stepsToAddSafe);
        steps += stepsToAddSafe;

        if (steps < STEPS_QUANTITY - 1) {
          this.state.minY = this.state.minY + deltaMinY / STEPS_QUANTITY * stepsToAddSafe;
          this.state.maxY = this.state.maxY + deltaMaxY / STEPS_QUANTITY * stepsToAddSafe;
          return
        }

        this.state.minY = newMinY;
        this.state.maxY = newMaxY;
        this.taskBatches.set(AnimationTypes.Drag, []);
      })
    );
    this.render();
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
      if (xs[counter] >= minX && counter - 1 >= 0) {
        searchStartIndex = counter - 1;
        break;
      }
    }
    let searchEndIndex = xs.length - 1;
    for (let counter = xs.length - 1; counter >= 0; counter--) {
      if (xs[counter] <= maxX && counter + 1 < xs.length - 1) {
        searchEndIndex = counter + 1;
        break;
      }
    }
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

  render(loop = false) {
    if (!loop && this.renderInProgress) {
      return;
    }
    this.renderInProgress = true;
    /**
     * @param {DOMHighResTimeStamp} highResTimestamp
     * */
    requestAnimationFrame(highResTimestamp => {
      //console.time('render');
      this.taskBatches.forEach(batch => {
        if (batch.length) {
          batch.pop()(highResTimestamp);
        }
      });
      this.taskBatches = new Map(
        [...this.taskBatches.entries()].filter(([, batch]) => !!batch.length)
      );

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
        this.render(true);
        return;
      }
      this.renderInProgress = false;
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
    return [...this.taskBatches.values()].some(v => !!v.length);
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

      initialRender: true,
}} */
const State = {};

/** @enum {string} */
const AnimationTypes = {
  Toggle: 'Toggle',
  Drag: 'Drag',
};

/**
 * @typedef {{minX: number, maxX: number, minY: number, maxY: number}}
 * */
const Extremums = {};
