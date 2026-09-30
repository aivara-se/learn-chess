/* Every stop's box as the map really drew it — learn-chess#60.
 *
 * Written by the pull request's browser check, not by hand:
 *
 *   NODE_PATH=$HOME/.bun/install/global/node_modules bun ~/tmp/pw/pairs.ts <checkout> <port> --fixture
 *
 * Each entry is one stop: its row (its depth in the course), its column's x, and the
 * box its marker and its words cover relative to that x and the row's own y. A unit
 * test cannot measure wrapped text, so this is the geometry measured once in a browser
 * and held still by `tests/place.test.ts`.
 */
export const MAP_BOXES = {
  "fresh-360": [
    {
      "row": 0,
      "x": 180,
      "left": -176,
      "right": 176,
      "top": -76,
      "bottom": 102
    },
    {
      "row": 1,
      "x": 68,
      "left": -64,
      "right": 64,
      "top": -36,
      "bottom": 118
    },
    {
      "row": 1,
      "x": 292,
      "left": -64,
      "right": 64,
      "top": -36,
      "bottom": 118
    },
    {
      "row": 2,
      "x": 180,
      "left": -55,
      "right": 55,
      "top": -36,
      "bottom": 134
    },
    {
      "row": 2,
      "x": 68,
      "left": -55,
      "right": 55,
      "top": -27,
      "bottom": 93
    },
    {
      "row": 3,
      "x": 68,
      "left": -55,
      "right": 55,
      "top": -36,
      "bottom": 134
    },
    {
      "row": 3,
      "x": 292,
      "left": -55,
      "right": 55,
      "top": -36,
      "bottom": 134
    },
    {
      "row": 3,
      "x": 180,
      "left": -55,
      "right": 55,
      "top": -27,
      "bottom": 109
    },
    {
      "row": 4,
      "x": 180,
      "left": -55,
      "right": 55,
      "top": -36,
      "bottom": 134
    },
    {
      "row": 4,
      "x": 68,
      "left": -55,
      "right": 55,
      "top": -27,
      "bottom": 93
    },
    {
      "row": 5,
      "x": 68,
      "left": -64,
      "right": 64,
      "top": -36,
      "bottom": 118
    },
    {
      "row": 5,
      "x": 292,
      "left": -64,
      "right": 64,
      "top": -36,
      "bottom": 118
    },
    {
      "row": 6,
      "x": 68,
      "left": -64,
      "right": 64,
      "top": -36,
      "bottom": 118
    },
    {
      "row": 6,
      "x": 292,
      "left": -64,
      "right": 64,
      "top": -42,
      "bottom": 88
    },
    {
      "row": 7,
      "x": 180,
      "left": -176,
      "right": 176,
      "top": -42,
      "bottom": 88
    }
  ],
  "fresh-520": [
    {
      "row": 0,
      "x": 260,
      "left": -256,
      "right": 256,
      "top": -76,
      "bottom": 102
    },
    {
      "row": 1,
      "x": 99,
      "left": -95,
      "right": 95,
      "top": -36,
      "bottom": 102
    },
    {
      "row": 1,
      "x": 421,
      "left": -95,
      "right": 95,
      "top": -36,
      "bottom": 102
    },
    {
      "row": 2,
      "x": 260,
      "left": -79,
      "right": 79,
      "top": -36,
      "bottom": 118
    },
    {
      "row": 2,
      "x": 99,
      "left": -79,
      "right": 79,
      "top": -27,
      "bottom": 93
    },
    {
      "row": 3,
      "x": 99,
      "left": -79,
      "right": 79,
      "top": -36,
      "bottom": 118
    },
    {
      "row": 3,
      "x": 421,
      "left": -79,
      "right": 79,
      "top": -36,
      "bottom": 118
    },
    {
      "row": 3,
      "x": 260,
      "left": -79,
      "right": 79,
      "top": -27,
      "bottom": 93
    },
    {
      "row": 4,
      "x": 260,
      "left": -79,
      "right": 79,
      "top": -36,
      "bottom": 118
    },
    {
      "row": 4,
      "x": 99,
      "left": -79,
      "right": 79,
      "top": -27,
      "bottom": 93
    },
    {
      "row": 5,
      "x": 99,
      "left": -95,
      "right": 95,
      "top": -36,
      "bottom": 118
    },
    {
      "row": 5,
      "x": 421,
      "left": -95,
      "right": 95,
      "top": -36,
      "bottom": 118
    },
    {
      "row": 6,
      "x": 99,
      "left": -95,
      "right": 95,
      "top": -36,
      "bottom": 102
    },
    {
      "row": 6,
      "x": 421,
      "left": -95,
      "right": 95,
      "top": -42,
      "bottom": 88
    },
    {
      "row": 7,
      "x": 260,
      "left": -256,
      "right": 256,
      "top": -42,
      "bottom": 88
    }
  ],
  "fresh-820": [
    {
      "row": 0,
      "x": 260,
      "left": -256,
      "right": 256,
      "top": -76,
      "bottom": 102
    },
    {
      "row": 1,
      "x": 99,
      "left": -95,
      "right": 95,
      "top": -36,
      "bottom": 102
    },
    {
      "row": 1,
      "x": 421,
      "left": -95,
      "right": 95,
      "top": -36,
      "bottom": 102
    },
    {
      "row": 2,
      "x": 260,
      "left": -79,
      "right": 79,
      "top": -36,
      "bottom": 118
    },
    {
      "row": 2,
      "x": 99,
      "left": -79,
      "right": 79,
      "top": -27,
      "bottom": 93
    },
    {
      "row": 3,
      "x": 99,
      "left": -79,
      "right": 79,
      "top": -36,
      "bottom": 118
    },
    {
      "row": 3,
      "x": 421,
      "left": -79,
      "right": 79,
      "top": -36,
      "bottom": 118
    },
    {
      "row": 3,
      "x": 260,
      "left": -79,
      "right": 79,
      "top": -27,
      "bottom": 93
    },
    {
      "row": 4,
      "x": 260,
      "left": -79,
      "right": 79,
      "top": -36,
      "bottom": 118
    },
    {
      "row": 4,
      "x": 99,
      "left": -79,
      "right": 79,
      "top": -27,
      "bottom": 93
    },
    {
      "row": 5,
      "x": 99,
      "left": -95,
      "right": 95,
      "top": -36,
      "bottom": 118
    },
    {
      "row": 5,
      "x": 421,
      "left": -95,
      "right": 95,
      "top": -36,
      "bottom": 118
    },
    {
      "row": 6,
      "x": 99,
      "left": -95,
      "right": 95,
      "top": -36,
      "bottom": 102
    },
    {
      "row": 6,
      "x": 421,
      "left": -95,
      "right": 95,
      "top": -42,
      "bottom": 88
    },
    {
      "row": 7,
      "x": 260,
      "left": -256,
      "right": 256,
      "top": -42,
      "bottom": 88
    }
  ],
  "half-360": [
    {
      "row": 0,
      "x": 180,
      "left": -176,
      "right": 176,
      "top": -36,
      "bottom": 102
    },
    {
      "row": 1,
      "x": 68,
      "left": -64,
      "right": 64,
      "top": -36,
      "bottom": 118
    },
    {
      "row": 1,
      "x": 292,
      "left": -64,
      "right": 64,
      "top": -36,
      "bottom": 118
    },
    {
      "row": 2,
      "x": 180,
      "left": -55,
      "right": 55,
      "top": -36,
      "bottom": 134
    },
    {
      "row": 2,
      "x": 68,
      "left": -55,
      "right": 55,
      "top": -27,
      "bottom": 109
    },
    {
      "row": 3,
      "x": 68,
      "left": -55,
      "right": 55,
      "top": -36,
      "bottom": 134
    },
    {
      "row": 3,
      "x": 292,
      "left": -55,
      "right": 55,
      "top": -76,
      "bottom": 134
    },
    {
      "row": 3,
      "x": 180,
      "left": -55,
      "right": 55,
      "top": -27,
      "bottom": 125
    },
    {
      "row": 4,
      "x": 180,
      "left": -55,
      "right": 55,
      "top": -36,
      "bottom": 134
    },
    {
      "row": 4,
      "x": 68,
      "left": -55,
      "right": 55,
      "top": -27,
      "bottom": 93
    },
    {
      "row": 5,
      "x": 68,
      "left": -64,
      "right": 64,
      "top": -36,
      "bottom": 118
    },
    {
      "row": 5,
      "x": 292,
      "left": -64,
      "right": 64,
      "top": -36,
      "bottom": 118
    },
    {
      "row": 6,
      "x": 68,
      "left": -64,
      "right": 64,
      "top": -36,
      "bottom": 118
    },
    {
      "row": 6,
      "x": 292,
      "left": -64,
      "right": 64,
      "top": -42,
      "bottom": 88
    },
    {
      "row": 7,
      "x": 180,
      "left": -176,
      "right": 176,
      "top": -42,
      "bottom": 88
    }
  ],
  "half-520": [
    {
      "row": 0,
      "x": 260,
      "left": -256,
      "right": 256,
      "top": -36,
      "bottom": 102
    },
    {
      "row": 1,
      "x": 99,
      "left": -95,
      "right": 95,
      "top": -36,
      "bottom": 102
    },
    {
      "row": 1,
      "x": 421,
      "left": -95,
      "right": 95,
      "top": -36,
      "bottom": 102
    },
    {
      "row": 2,
      "x": 260,
      "left": -79,
      "right": 79,
      "top": -36,
      "bottom": 118
    },
    {
      "row": 2,
      "x": 99,
      "left": -79,
      "right": 79,
      "top": -27,
      "bottom": 93
    },
    {
      "row": 3,
      "x": 99,
      "left": -79,
      "right": 79,
      "top": -36,
      "bottom": 118
    },
    {
      "row": 3,
      "x": 421,
      "left": -79,
      "right": 79,
      "top": -76,
      "bottom": 118
    },
    {
      "row": 3,
      "x": 260,
      "left": -79,
      "right": 79,
      "top": -27,
      "bottom": 93
    },
    {
      "row": 4,
      "x": 260,
      "left": -79,
      "right": 79,
      "top": -36,
      "bottom": 118
    },
    {
      "row": 4,
      "x": 99,
      "left": -79,
      "right": 79,
      "top": -27,
      "bottom": 93
    },
    {
      "row": 5,
      "x": 99,
      "left": -95,
      "right": 95,
      "top": -36,
      "bottom": 118
    },
    {
      "row": 5,
      "x": 421,
      "left": -95,
      "right": 95,
      "top": -36,
      "bottom": 118
    },
    {
      "row": 6,
      "x": 99,
      "left": -95,
      "right": 95,
      "top": -36,
      "bottom": 102
    },
    {
      "row": 6,
      "x": 421,
      "left": -95,
      "right": 95,
      "top": -42,
      "bottom": 88
    },
    {
      "row": 7,
      "x": 260,
      "left": -256,
      "right": 256,
      "top": -42,
      "bottom": 88
    }
  ],
  "half-820": [
    {
      "row": 0,
      "x": 260,
      "left": -256,
      "right": 256,
      "top": -36,
      "bottom": 102
    },
    {
      "row": 1,
      "x": 99,
      "left": -95,
      "right": 95,
      "top": -36,
      "bottom": 102
    },
    {
      "row": 1,
      "x": 421,
      "left": -95,
      "right": 95,
      "top": -36,
      "bottom": 102
    },
    {
      "row": 2,
      "x": 260,
      "left": -79,
      "right": 79,
      "top": -36,
      "bottom": 118
    },
    {
      "row": 2,
      "x": 99,
      "left": -79,
      "right": 79,
      "top": -27,
      "bottom": 93
    },
    {
      "row": 3,
      "x": 99,
      "left": -79,
      "right": 79,
      "top": -36,
      "bottom": 118
    },
    {
      "row": 3,
      "x": 421,
      "left": -79,
      "right": 79,
      "top": -76,
      "bottom": 118
    },
    {
      "row": 3,
      "x": 260,
      "left": -79,
      "right": 79,
      "top": -27,
      "bottom": 93
    },
    {
      "row": 4,
      "x": 260,
      "left": -79,
      "right": 79,
      "top": -36,
      "bottom": 118
    },
    {
      "row": 4,
      "x": 99,
      "left": -79,
      "right": 79,
      "top": -27,
      "bottom": 93
    },
    {
      "row": 5,
      "x": 99,
      "left": -95,
      "right": 95,
      "top": -36,
      "bottom": 118
    },
    {
      "row": 5,
      "x": 421,
      "left": -95,
      "right": 95,
      "top": -36,
      "bottom": 118
    },
    {
      "row": 6,
      "x": 99,
      "left": -95,
      "right": 95,
      "top": -36,
      "bottom": 102
    },
    {
      "row": 6,
      "x": 421,
      "left": -95,
      "right": 95,
      "top": -42,
      "bottom": 88
    },
    {
      "row": 7,
      "x": 260,
      "left": -256,
      "right": 256,
      "top": -42,
      "bottom": 88
    }
  ],
  "done-360": [
    {
      "row": 0,
      "x": 180,
      "left": -176,
      "right": 176,
      "top": -36,
      "bottom": 102
    },
    {
      "row": 1,
      "x": 68,
      "left": -64,
      "right": 64,
      "top": -36,
      "bottom": 118
    },
    {
      "row": 1,
      "x": 292,
      "left": -64,
      "right": 64,
      "top": -36,
      "bottom": 118
    },
    {
      "row": 2,
      "x": 180,
      "left": -55,
      "right": 55,
      "top": -36,
      "bottom": 134
    },
    {
      "row": 2,
      "x": 68,
      "left": -55,
      "right": 55,
      "top": -27,
      "bottom": 109
    },
    {
      "row": 3,
      "x": 68,
      "left": -55,
      "right": 55,
      "top": -36,
      "bottom": 134
    },
    {
      "row": 3,
      "x": 292,
      "left": -55,
      "right": 55,
      "top": -36,
      "bottom": 134
    },
    {
      "row": 3,
      "x": 180,
      "left": -55,
      "right": 55,
      "top": -27,
      "bottom": 125
    },
    {
      "row": 4,
      "x": 180,
      "left": -55,
      "right": 55,
      "top": -36,
      "bottom": 134
    },
    {
      "row": 4,
      "x": 68,
      "left": -55,
      "right": 55,
      "top": -27,
      "bottom": 109
    },
    {
      "row": 5,
      "x": 68,
      "left": -64,
      "right": 64,
      "top": -36,
      "bottom": 118
    },
    {
      "row": 5,
      "x": 292,
      "left": -64,
      "right": 64,
      "top": -36,
      "bottom": 118
    },
    {
      "row": 6,
      "x": 68,
      "left": -64,
      "right": 64,
      "top": -36,
      "bottom": 118
    },
    {
      "row": 6,
      "x": 292,
      "left": -64,
      "right": 64,
      "top": -42,
      "bottom": 88
    },
    {
      "row": 7,
      "x": 180,
      "left": -176,
      "right": 176,
      "top": -42,
      "bottom": 88
    }
  ],
  "done-520": [
    {
      "row": 0,
      "x": 260,
      "left": -256,
      "right": 256,
      "top": -36,
      "bottom": 102
    },
    {
      "row": 1,
      "x": 99,
      "left": -95,
      "right": 95,
      "top": -36,
      "bottom": 102
    },
    {
      "row": 1,
      "x": 421,
      "left": -95,
      "right": 95,
      "top": -36,
      "bottom": 102
    },
    {
      "row": 2,
      "x": 260,
      "left": -79,
      "right": 79,
      "top": -36,
      "bottom": 118
    },
    {
      "row": 2,
      "x": 99,
      "left": -79,
      "right": 79,
      "top": -27,
      "bottom": 93
    },
    {
      "row": 3,
      "x": 99,
      "left": -79,
      "right": 79,
      "top": -36,
      "bottom": 118
    },
    {
      "row": 3,
      "x": 421,
      "left": -79,
      "right": 79,
      "top": -36,
      "bottom": 118
    },
    {
      "row": 3,
      "x": 260,
      "left": -79,
      "right": 79,
      "top": -27,
      "bottom": 93
    },
    {
      "row": 4,
      "x": 260,
      "left": -79,
      "right": 79,
      "top": -36,
      "bottom": 118
    },
    {
      "row": 4,
      "x": 99,
      "left": -79,
      "right": 79,
      "top": -27,
      "bottom": 93
    },
    {
      "row": 5,
      "x": 99,
      "left": -95,
      "right": 95,
      "top": -36,
      "bottom": 118
    },
    {
      "row": 5,
      "x": 421,
      "left": -95,
      "right": 95,
      "top": -36,
      "bottom": 118
    },
    {
      "row": 6,
      "x": 99,
      "left": -95,
      "right": 95,
      "top": -36,
      "bottom": 102
    },
    {
      "row": 6,
      "x": 421,
      "left": -95,
      "right": 95,
      "top": -42,
      "bottom": 88
    },
    {
      "row": 7,
      "x": 260,
      "left": -256,
      "right": 256,
      "top": -42,
      "bottom": 88
    }
  ],
  "done-820": [
    {
      "row": 0,
      "x": 260,
      "left": -256,
      "right": 256,
      "top": -36,
      "bottom": 102
    },
    {
      "row": 1,
      "x": 99,
      "left": -95,
      "right": 95,
      "top": -36,
      "bottom": 102
    },
    {
      "row": 1,
      "x": 421,
      "left": -95,
      "right": 95,
      "top": -36,
      "bottom": 102
    },
    {
      "row": 2,
      "x": 260,
      "left": -79,
      "right": 79,
      "top": -36,
      "bottom": 118
    },
    {
      "row": 2,
      "x": 99,
      "left": -79,
      "right": 79,
      "top": -27,
      "bottom": 93
    },
    {
      "row": 3,
      "x": 99,
      "left": -79,
      "right": 79,
      "top": -36,
      "bottom": 118
    },
    {
      "row": 3,
      "x": 421,
      "left": -79,
      "right": 79,
      "top": -36,
      "bottom": 118
    },
    {
      "row": 3,
      "x": 260,
      "left": -79,
      "right": 79,
      "top": -27,
      "bottom": 93
    },
    {
      "row": 4,
      "x": 260,
      "left": -79,
      "right": 79,
      "top": -36,
      "bottom": 118
    },
    {
      "row": 4,
      "x": 99,
      "left": -79,
      "right": 79,
      "top": -27,
      "bottom": 93
    },
    {
      "row": 5,
      "x": 99,
      "left": -95,
      "right": 95,
      "top": -36,
      "bottom": 118
    },
    {
      "row": 5,
      "x": 421,
      "left": -95,
      "right": 95,
      "top": -36,
      "bottom": 118
    },
    {
      "row": 6,
      "x": 99,
      "left": -95,
      "right": 95,
      "top": -36,
      "bottom": 102
    },
    {
      "row": 6,
      "x": 421,
      "left": -95,
      "right": 95,
      "top": -42,
      "bottom": 88
    },
    {
      "row": 7,
      "x": 260,
      "left": -256,
      "right": 256,
      "top": -42,
      "bottom": 88
    }
  ]
} as const;
