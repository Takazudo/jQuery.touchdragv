/*! jQuery.touchdragv (https://github.com/Takazudo/jQuery.touchdragv)
 * lastupdate: 2013-04-18
 * version: 1.0.0
 * author: 'Takazudo' Takeshi Takatsudo <takazudo@gmail.com>
 * License: MIT */
(function() {
  var __slice = [].slice,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

  (function($, window, document) {
    var $document, ns;
    $document = $(document);
    ns = $.TouchdragvNs = {};
    ns.normalizeXY = function(event) {
      var orig, res, touch;
      res = {};
      orig = event.originalEvent;
      if (orig.changedTouches != null) {
        touch = orig.changedTouches[0];
        res.x = touch.pageX;
        res.y = touch.pageY;
      } else {
        res.x = event.pageX || orig.pageX;
        res.y = event.pageY || orig.pageY;
      }
      return res;
    };
    ns.support = {};
    ns.ua = {};
    ns.support.addEventListener = 'addEventListener' in document;
    ns.support.touch = 'ontouchend' in document;
    ns.support.mspointer = window.navigator.msPointerEnabled || false;
    ns.ua.win8orhigh = (function() {
      var matched, ua, version;
      ua = navigator.userAgent;
      matched = ua.match(/Windows NT ([\d\.]+)/);
      if (!matched) {
        return false;
      }
      version = matched[1] * 1;
      if (version < 6.2) {
        return false;
      }
      return true;
    })();
    ns.getEventNameSet = function(eventName) {
      var res;
      res = {};
      switch (eventName) {
        case 'touchstart':
          res.move = 'touchmove';
          res.end = 'touchend';
          break;
        case 'mousedown':
          res.move = 'mousemove';
          res.end = 'mouseup';
          break;
        case 'MSPointerDown':
          res.move = 'MSPointerMove';
          res.end = 'MSPointerUp';
          break;
        case 'pointerdown':
          res.move = 'pointermove';
          res.end = 'pointerup';
      }
      return res;
    };
    ns.getTopPx = function($el) {
      var l;
      l = $el.css('top');
      if (l === 'auto') {
        l = 0;
      } else {
        l = (l.replace(/px/, '')) * 1;
      }
      return l;
    };
    ns.startWatchGestures = (function() {
      var init, initDone;
      initDone = false;
      init = function() {
        initDone = true;
        $document.on('gesturestart', function() {
          return ns.whileGesture = true;
        });
        return $document.on('gestureend', function() {
          return ns.whileGesture = false;
        });
      };
      return function() {
        if (this.initDone) {
          return;
        }
        return init();
      };
    })();
    ns.Event = (function() {

      function Event() {}

      Event.prototype.on = function(ev, callback) {
        var evs, name, _base, _i, _len;
        if (this._callbacks == null) {
          this._callbacks = {};
        }
        evs = ev.split(' ');
        for (_i = 0, _len = evs.length; _i < _len; _i++) {
          name = evs[_i];
          (_base = this._callbacks)[name] || (_base[name] = []);
          this._callbacks[name].push(callback);
        }
        return this;
      };

      Event.prototype.once = function(ev, callback) {
        this.on(ev, function() {
          this.off(ev, arguments.callee);
          return callback.apply(this, arguments);
        });
        return this;
      };

      Event.prototype.trigger = function() {
        var args, callback, ev, list, _i, _len, _ref;
        args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
        ev = args.shift();
        list = (_ref = this._callbacks) != null ? _ref[ev] : void 0;
        if (!list) {
          return;
        }
        for (_i = 0, _len = list.length; _i < _len; _i++) {
          callback = list[_i];
          if (callback.apply(this, args) === false) {
            break;
          }
        }
        return this;
      };

      Event.prototype.off = function(ev, callback) {
        var cb, i, list, _i, _len, _ref;
        if (!ev) {
          this._callbacks = {};
          return this;
        }
        list = (_ref = this._callbacks) != null ? _ref[ev] : void 0;
        if (!list) {
          return this;
        }
        if (!callback) {
          delete this._callbacks[ev];
          return this;
        }
        for (i = _i = 0, _len = list.length; _i < _len; i = ++_i) {
          cb = list[i];
          if (!(cb === callback)) {
            continue;
          }
          list = list.slice();
          list.splice(i, 1);
          this._callbacks[ev] = list;
          break;
        }
        return this;
      };

      return Event;

    })();
    ns.OneDrag = (function(_super) {

      __extends(OneDrag, _super);

      function OneDrag() {
        this._scrollDirectionDecided = false;
      }

      OneDrag.prototype.applyTouchStart = function(touchStartEvent) {
        var coords;
        coords = ns.normalizeXY(touchStartEvent);
        this.startPageX = coords.x;
        this.startPageY = coords.y;
        return this;
      };

      OneDrag.prototype.applyTouchMove = function(touchMoveEvent) {
        var coords, distX, distY, triggerEvent,
          _this = this;
        coords = ns.normalizeXY(touchMoveEvent);
        triggerEvent = function() {
          var diffY;
          diffY = coords.y - _this.startPageY;
          return _this.trigger('dragmove', {
            y: diffY
          });
        };
        if (this._scrollDirectionDecided) {
          triggerEvent();
        } else {
          distX = Math.abs(coords.x - this.startPageX);
          distY = Math.abs(coords.y - this.startPageY);
          if ((distX > 5) || (distY > 5)) {
            this._scrollDirectionDecided = true;
            if (distX > 5) {
              this.trigger('xscrolldetected');
            } else if (distY > 5) {
              this.trigger('yscrolldetected');
            }
          }
        }
        return this;
      };

      OneDrag.prototype.destroy = function() {
        this.off();
        return this;
      };

      return OneDrag;

    })(ns.Event);
    ns.TouchdragvEl = (function(_super) {

      __extends(TouchdragvEl, _super);

      TouchdragvEl.prototype.defaults = {
        inner: '> *',
        backanim_duration: 250,
        backanim_easing: 'swing',
        beforefirstrefresh: null,
        triggerrefreshimmediately: true,
        tweakinnerpositionstyle: false
      };

      function TouchdragvEl($el, options) {
        this.$el = $el;
        this._handleTouchEnd = __bind(this._handleTouchEnd, this);
        this._handleTouchMove = __bind(this._handleTouchMove, this);
        this._handleTouchStart = __bind(this._handleTouchStart, this);
        this._handleClickToIgnore = __bind(this._handleClickToIgnore, this);
        this.el = this.$el[0];
        this.options = $.extend({}, this.defaults, options);
        this.disabled = false;
        ns.startWatchGestures();
        this._handlePointerEvents();
        this._prepareEls();
        this._eventify();
        if (this.options.triggerrefreshimmediately) {
          this.refresh();
        }
      }

      TouchdragvEl.prototype.refresh = function() {
        this._calcMinMaxTop();
        this._handleTooNarrow();
        this._handleInnerOver();
        if (!this._firstRefreshDone) {
          if (this.options.beforefirstrefresh) {
            this.options.beforefirstrefresh(this);
          }
          this.trigger('firstrefresh', this);
          this._firstRefreshDone = true;
        }
        this.trigger('refresh', this);
        return this;
      };

      TouchdragvEl.prototype._handlePointerEvents = function() {
        if (!ns.support.mspointer) {
          return this;
        }
        this.el.style.msTouchAction = 'none';
        return this;
      };

      TouchdragvEl.prototype._prepareEls = function() {
        this.$inner = this.$el.find(this.options.inner);
        if (this.options.tweakinnerpositionstyle) {
          this.$inner.css({
            position: 'relative'
          });
        }
        return this;
      };

      TouchdragvEl.prototype._calcMinMaxTop = function() {
        this._maxTop = 0;
        this._minTop = -(this.$inner.outerHeight() - this.$el.innerHeight());
        return this;
      };

      TouchdragvEl.prototype._eventify = function() {
        var eventNames;
        eventNames = 'pointerdown MSPointerDown touchstart mousedown';
        this.$el.on(eventNames, this._handleTouchStart);
        if (ns.support.addEventListener) {
          this.el.addEventListener('click', $.noop, true);
        }
        return this;
      };

      TouchdragvEl.prototype._handleClickToIgnore = function(event) {
        event.stopPropagation();
        event.preventDefault();
        return this;
      };

      TouchdragvEl.prototype._handleTouchStart = function(event) {
        var d,
          _this = this;
        if (this.disabled) {
          return this;
        }
        if (this._whileDrag) {
          return this;
        }
        if (ns.whileGesture) {
          return this;
        }
        if (event.type === 'mousedown') {
          event.preventDefault();
        }
        this._currentEventNameSet = ns.getEventNameSet(event.type);
        this._whileDrag = true;
        this._slidecanceled = false;
        this._shouldSlideInner = false;
        d = this._currentDrag = new ns.OneDrag;
        d.on('xscrolldetected', function() {
          _this._whileDrag = false;
          _this._slidecanceled = true;
          return _this.trigger('slidecancel');
        });
        d.on('yscrolldetected', function() {
          _this._shouldSlideInner = true;
          _this.trigger('dragstart');
          return _this.$el.on('click', 'a', _this._handleClickToIgnore);
        });
        d.on('dragmove', function(data) {
          _this.trigger('drag');
          return _this._moveInner(data.y);
        });
        this._innerStartTop = ns.getTopPx(this.$inner);
        d.applyTouchStart(event);
        $document.on(this._currentEventNameSet.move, this._handleTouchMove);
        $document.on(this._currentEventNameSet.end, this._handleTouchEnd);
        return this;
      };

      TouchdragvEl.prototype._handleTouchMove = function(event) {
        if (!this._whileDrag) {
          return this;
        }
        if (ns.whileGesture) {
          return this;
        }
        this._currentDrag.applyTouchMove(event);
        if (this._shouldSlideInner) {
          event.preventDefault();
          event.stopPropagation();
        }
        return this;
      };

      TouchdragvEl.prototype._handleTouchEnd = function(event) {
        var _this = this;
        this._whileDrag = false;
        $document.off(this._currentEventNameSet.move, this._handleTouchMove);
        $document.off(this._currentEventNameSet.end, this._handleTouchEnd);
        this._currentDrag.destroy();
        this._currentEventNameSet = null;
        if (!this._slidecanceled) {
          this.trigger('dragend');
        }
        setTimeout(function() {
          return _this.$el.off('click', 'a', _this._handleClickToIgnore);
        }, 10);
        this._handleInnerOver(true);
        return this;
      };

      TouchdragvEl.prototype._moveInner = function(y) {
        var data, top;
        top = this._innerStartTop + y;
        if (top > this._maxTop) {
          top = this._maxTop + ((top - this._maxTop) / 3);
        } else if (top < this._minTop) {
          top = this._minTop + ((top - this._minTop) / 3);
        }
        this.$inner.css('top', top);
        data = {
          top: top
        };
        this.trigger('move', data);
        return this;
      };

      TouchdragvEl.prototype._handleInnerOver = function(invokeEndEvent) {
        var belowMin, overMax, to, top, triggerEvent,
          _this = this;
        if (invokeEndEvent == null) {
          invokeEndEvent = false;
        }
        if (this.isInnerTooNarrow()) {
          return this;
        }
        triggerEvent = function() {
          if (invokeEndEvent) {
            return _this.trigger('moveend');
          }
        };
        to = null;
        top = this.currentSlideTop();
        overMax = top > this._maxTop;
        belowMin = top < this._minTop;
        if (!(overMax || belowMin)) {
          triggerEvent();
          return this;
        }
        if (overMax) {
          to = this._maxTop;
        }
        if (belowMin) {
          to = this._minTop;
        }
        this.slide(to, true, function() {
          return triggerEvent();
        });
        return this;
      };

      TouchdragvEl.prototype._handleTooNarrow = function() {
        if (this.isInnerTooNarrow()) {
          this.disable();
          this.$inner.css('top', 0);
        } else {
          this.enable();
        }
        return this;
      };

      TouchdragvEl.prototype.isInnerTooNarrow = function() {
        var elH, innerH;
        elH = this.$el.height();
        innerH = this.$inner.height();
        return innerH <= elH;
      };

      TouchdragvEl.prototype.disable = function() {
        this.disabled = true;
        return this;
      };

      TouchdragvEl.prototype.enable = function() {
        this.disabled = false;
        return this;
      };

      TouchdragvEl.prototype.slide = function(val, animate, callback) {
        var d, e, to,
          _this = this;
        if (animate == null) {
          animate = false;
        }
        if (val > this._maxTop) {
          val = this._maxTop;
        }
        if (val < this._minTop) {
          val = this._minTop;
        }
        d = this.options.backanim_duration;
        e = this.options.backanim_easing;
        to = {
          top: val
        };
        return $.Deferred(function(defer) {
          var onDone;
          _this.trigger('beforeslide');
          onDone = function() {
            _this.trigger('afterslide');
            if (typeof callback === "function") {
              callback();
            }
            return defer.resolve();
          };
          if (animate) {
            return _this.$inner.stop().animate(to, d, e, function() {
              return onDone();
            });
          } else {
            _this.$inner.stop().css(to);
            return onDone();
          }
        }).promise();
      };

      TouchdragvEl.prototype.currentSlideTop = function() {
        return ns.getTopPx(this.$inner);
      };

      TouchdragvEl.prototype.updateInnerHeight = function(val) {
        this.$inner.height(val);
        return this;
      };

      return TouchdragvEl;

    })(ns.Event);
    ns.TouchdragvFitty = (function(_super) {

      __extends(TouchdragvFitty, _super);

      TouchdragvFitty.prototype.defaults = {
        item: null,
        beforefirstfresh: null,
        startindex: 0,
        triggerrefreshimmediately: true
      };

      function TouchdragvFitty($el, options) {
        this.$el = $el;
        this.options = $.extend({}, this.defaults, options);
        this.currentIndex = this.options.startindex;
        this._preparetouchdragv();
        if (this.options.triggerrefreshimmediately) {
          this.refresh();
        }
      }

      TouchdragvFitty.prototype._preparetouchdragv = function() {
        var options,
          _this = this;
        options = $.extend({}, this.options);
        options.triggerrefreshimmediately = false;
        options.beforefirstrefresh = function(touchdragv) {
          touchdragv.once('firstrefresh', function() {
            var _base;
            if (typeof (_base = _this.options).beforefirstrefresh === "function") {
              _base.beforefirstrefresh(_this);
            }
            _this.trigger('firstrefresh', _this);
            return _this._firstRefreshDone = true;
          });
          touchdragv.on('refresh', function() {
            return _this.trigger('refresh');
          });
          touchdragv.on('slidecancel', function() {
            return _this.trigger('slidecancel');
          });
          touchdragv.on('dragstart', function() {
            return _this.trigger('dragstart');
          });
          touchdragv.on('drag', function() {
            return _this.trigger('drag');
          });
          touchdragv.on('dragend', function() {
            return _this.trigger('dragend');
          });
          return touchdragv.on('moveend', function() {
            var caliculatedIndex, itemH, nextIndex, slidedDistance;
            slidedDistance = -touchdragv.currentSlideTop();
            itemH = _this.$el.innerHeight();
            nextIndex = null;
            caliculatedIndex = slidedDistance / itemH;
            if (caliculatedIndex < _this.currentIndex) {
              nextIndex = _this.currentIndex - 1;
            } else if (caliculatedIndex > _this.currentIndex) {
              nextIndex = _this.currentIndex + 1;
            }
            if (nextIndex !== null) {
              _this.updateIndex(nextIndex);
              return _this.adjustToFit(itemH, true);
            }
          });
        };
        this._touchdragv = new ns.TouchdragvEl(this.$el, options);
        return this;
      };

      TouchdragvFitty.prototype.updateIndex = function(index) {
        var data, lastIndex;
        if (!((0 <= index && index < this.$items.length))) {
          return false;
        }
        lastIndex = this.currentIndex;
        this.currentIndex = index;
        if (lastIndex !== index) {
          data = {
            index: this.currentIndex
          };
          this.trigger('indexchange', data);
        }
        return true;
      };

      TouchdragvFitty.prototype.refresh = function() {
        var innerH, itemH;
        this.$items = this.$el.find(this.options.item);
        itemH = this._itemHeight = this.$el.innerHeight();
        innerH = itemH * this.$items.length;
        this._touchdragv.updateInnerHeight(innerH);
        this.$items.height(itemH);
        this._touchdragv.refresh();
        this.adjustToFit(itemH);
        return this;
      };

      TouchdragvFitty.prototype.adjustToFit = function(itemHeight, animate, callback) {
        var _this = this;
        if (animate == null) {
          animate = false;
        }
        if (itemHeight == null) {
          itemHeight = this.$items.height();
        }
        return $.Deferred(function(defer) {
          var i, top_after, top_pre;
          i = _this.currentIndex;
          top_after = -itemHeight * i;
          top_pre = _this._touchdragv.currentSlideTop();
          if (top_after === top_pre) {
            defer.resolve();
            return _this;
          }
          if (!_this._sliding) {
            _this.trigger('slidestart');
          }
          _this._sliding = true;
          return _this._touchdragv.slide(top_after, animate, function() {
            var data;
            _this._sliding = false;
            data = {
              index: _this.currentIndex
            };
            _this.trigger('slideend', data);
            if (typeof callback === "function") {
              callback();
            }
            return defer.resolve();
          });
        }).promise();
      };

      TouchdragvFitty.prototype.to = function(index, animate) {
        var updated,
          _this = this;
        if (animate == null) {
          animate = false;
        }
        updated = this.updateIndex(index);
        return $.Deferred(function(defer) {
          if (updated) {
            return _this.adjustToFit(null, animate, function() {
              return defer.resolve();
            });
          } else {
            _this.trigger('invalidindexrequested');
            return defer.resolve();
          }
        }).promise();
      };

      TouchdragvFitty.prototype.next = function(animate) {
        if (animate == null) {
          animate = false;
        }
        return this.to(this.currentIndex + 1, animate);
      };

      TouchdragvFitty.prototype.prev = function(animate) {
        if (animate == null) {
          animate = false;
        }
        return this.to(this.currentIndex - 1, animate);
      };

      return TouchdragvFitty;

    })(ns.Event);
    $.fn.touchdragv = function(options) {
      return this.each(function(i, el) {
        var $el, instance;
        $el = $(el);
        instance = new ns.TouchdragvEl($el, options);
        $el.data('touchdragv', instance);
      });
    };
    $.fn.touchdragvfitty = function(options) {
      return this.each(function(i, el) {
        var $el, instance;
        $el = $(el);
        instance = new ns.TouchdragvFitty($el, options);
        $el.data('touchdragvfitty', instance);
      });
    };
    $.Touchdragv = ns.touchdragvEl;
    return $.TouchdragvFitty = ns.touchdragvFitty;
  })(jQuery, window, document);

}).call(this);
