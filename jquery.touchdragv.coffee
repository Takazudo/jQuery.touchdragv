# encapsulate plugin
do ($=jQuery, window=window, document=document) ->

  $document = $(document)

  ns = $.TouchdragvNs = {}

  # ============================================================
  # pageX/Y normalizer

  ns.normalizeXY = (event) ->

    res = {}
    orig = event.originalEvent

    if orig.changedTouches?
      # if it was a touch event
      touch = orig.changedTouches[0]
      res.x = touch.pageX
      res.y = touch.pageY
    else
      # jQuery cannnot handle pointerevents, so check orig.pageX/Y too.
      res.x = event.pageX or orig.pageX
      res.y = event.pageY or orig.pageY

    return res

  # ============================================================
  # detect / normalize event names

  ns.support = {}
  ns.ua = {}

  ns.support.addEventListener = 'addEventListener' of document

  # from Modernizr
  ns.support.touch = 'ontouchend' of document

  # http://msdn.microsoft.com/en-us/library/ie/hh673557(v=vs.85).aspx
  ns.support.mspointer = window.navigator.msPointerEnabled or false

  # http://msdn.microsoft.com/en-us/library/ie/hh920767(v=vs.85).aspx
  ns.ua.win8orhigh = do ->
    # windows browsers has str like "Windows NT 6.2" in its UA
    # Win8 UAs' version is "6.2"
    # browsers above this version may has touch events.
    ua = navigator.userAgent
    matched = ua.match(/Windows NT ([\d\.]+)/)
    return false unless matched
    version = matched[1] * 1
    return false if version < 6.2
    return true

  # returns related eventNameSet
  ns.getEventNameSet = (eventName) ->
    res = {}
    switch eventName
      when 'touchstart'
        res.move = 'touchmove'
        res.end = 'touchend'
      when 'mousedown'
        res.move = 'mousemove'
        res.end = 'mouseup'
      when 'MSPointerDown'
        res.move = 'MSPointerMove'
        res.end = 'MSPointerUp'
      when 'pointerdown'
        res.move = 'pointermove'
        res.end = 'pointerup'
    return res
  
  # ============================================================
  # top value getter

  ns.getTopPx = ($el) ->
    l = $el.css 'top'
    if l is 'auto'
      l = 0
    else
      l = (l.replace /px/, '') * 1
    return l

  # ============================================================
  # gesture handler

  ns.startWatchGestures = do ->
    initDone = false
    init = ->
      initDone = true
      $document.bind 'gesturestart', ->
        ns.whileGesture = true
      $document.bind 'gestureend', ->
        ns.whileGesture = false
    ->
      return if @initDone
      init()

  # ============================================================
  # event module

  class ns.Event

    on: (ev, callback) ->
      @_callbacks = {} unless @_callbacks?
      evs = ev.split(' ')
      for name in evs
        @_callbacks[name] or= []
        @_callbacks[name].push(callback)
      return this

    once: (ev, callback) ->
      @on ev, ->
        @off(ev, arguments.callee)
        callback.apply(@, arguments)
      return this

    trigger: (args...) ->
      ev = args.shift()
      list = @_callbacks?[ev]
      return unless list
      for callback in list
        if callback.apply(@, args) is false
          break
      return this

    off: (ev, callback) ->
      unless ev
        @_callbacks = {}
        return this

      list = @_callbacks?[ev]
      return this unless list

      unless callback
        delete @_callbacks[ev]
        return this

      for cb, i in list when cb is callback
        list = list.slice()
        list.splice(i, 1)
        @_callbacks[ev] = list
        break

      return this

  # ============================================================
  # OneDrag

  class ns.OneDrag extends ns.Event
    
    constructor: ->

      @_scrollDirectionDecided = false

    applyTouchStart: (touchStartEvent) ->

      coords = ns.normalizeXY touchStartEvent
      @startPageX = coords.x
      @startPageY = coords.y

      return this

    applyTouchMove: (touchMoveEvent) ->

      coords = ns.normalizeXY touchMoveEvent

      triggerEvent = =>
        diffY = coords.y - @startPageY
        @trigger 'dragmove', { y: diffY }

      if @_scrollDirectionDecided
        triggerEvent()
      else
        distX = Math.abs(coords.x - @startPageX)
        distY = Math.abs(coords.y - @startPageY)
        if (distX > 5) or (distY > 5)
          @_scrollDirectionDecided = true
          if distX > 5
            @trigger 'xscrolldetected'
          else if distY > 5
            @trigger 'yscrolldetected'
      return this

    destroy: ->
      @off()
      return this

  # ============================================================
  # TouchdragvEl

  class ns.TouchdragvEl extends ns.Event

    defaults:
      inner: '> *' # selector
      backanim_duration: 250
      backanim_easing: 'swing'
      beforefirstrefresh: null # fn
      triggerrefreshimmediately: true
      tweakinnerpositionstyle: false

    constructor: (@$el, options) ->

      @el = @$el[0]
      @options = $.extend {}, @defaults, options
      @disabled = false
      
      ns.startWatchGestures()
      @_handlePointerEvents()
      @_prepareEls()
      @_eventify()
      @refresh() if @options.triggerrefreshimmediately

    refresh: ->
      @_calcMinMaxTop()
      @_handleTooNarrow()
      @_handleInnerOver()
      unless @_firstRefreshDone
        if @options.beforefirstrefresh
          @options.beforefirstrefresh this
        @trigger 'firstrefresh', this
        @_firstRefreshDone = true
      @trigger 'refresh', this
      return this

    _handlePointerEvents: ->
      return @ unless ns.support.mspointer
      @el.style.msTouchAction = 'none'
      return this

    _prepareEls: ->
      @$inner = @$el.find @options.inner
      if @options.tweakinnerpositionstyle
        @$inner.css
          position: 'relative'
      return this
    
    _calcMinMaxTop: ->
      @_maxTop = 0
      @_minTop = -(@$inner.outerHeight() - @$el.innerHeight())
      return this

    _eventify: ->
      eventNames = 'pointerdown MSPointerDown touchstart mousedown'
      @$el.bind eventNames, @_handleTouchStart
      if ns.support.addEventListener
        @el.addEventListener 'click', $.noop , true
      return this

    _handleClickToIgnore: (event) =>
      event.stopPropagation()
      event.preventDefault()
      return this

    _handleTouchStart: (event) =>

      return this if @disabled
      return this if @_whileDrag

      # It'll be bugged if gestured
      return this if ns.whileGesture

      # prevent if mouseclick
      event.preventDefault() if event.type is 'mousedown'

      # detect eventNameSet then save
      @_currentEventNameSet = ns.getEventNameSet event.type

      @_whileDrag = true
      @_slidecanceled = false
      @_shouldSlideInner = false

      # handle drag via OneDrag class
      d = @_currentDrag = new ns.OneDrag
      d.on 'xscrolldetected', =>
        @_whileDrag = false
        @_slidecanceled = true
        @trigger 'slidecancel'
      d.on 'yscrolldetected', =>
        @_shouldSlideInner = true
        @trigger 'dragstart'
        # ignore click if drag
        @$el.delegate 'a', 'click', @_handleClickToIgnore
      d.on 'dragmove', (data) =>
        @trigger 'drag'
        @_moveInner data.y

      @_innerStartTop = ns.getTopPx @$inner

      d.applyTouchStart event

      # Let's observe move/end now
      $document.bind @_currentEventNameSet.move, @_handleTouchMove
      $document.bind @_currentEventNameSet.end, @_handleTouchEnd

      return this

    _handleTouchMove: (event) =>

      return this unless @_whileDrag
      return this if ns.whileGesture

      @_currentDrag.applyTouchMove event

      if @_shouldSlideInner
        event.preventDefault()
        event.stopPropagation()
      return this

    _handleTouchEnd: (event) =>

      @_whileDrag = false

      # unbind everything about this drag
      $document.unbind @_currentEventNameSet.move, @_handleTouchMove
      $document.unbind @_currentEventNameSet.end, @_handleTouchEnd

      @_currentDrag.destroy()

      # we don't need nameset anymore
      @_currentEventNameSet = null

      @trigger 'dragend' unless @_slidecanceled

      # enable click again
      setTimeout =>
        @$el.undelegate 'a', 'click', @_handleClickToIgnore
      , 10

      # if inner was over, fit it to inside.
      @_handleInnerOver true
      return this

    _moveInner: (y) ->
      top = @_innerStartTop + y

      # slow down if over
      if (top > @_maxTop)
        top = @_maxTop + ((top - @_maxTop) / 3)
      else if (top < @_minTop)
        top = @_minTop + ((top - @_minTop) / 3)

      @$inner.css 'top', top
      data = { top: top }
      @trigger 'move', data
      return this

    _handleInnerOver: (invokeEndEvent = false) ->

      return this if @isInnerTooNarrow()

      triggerEvent = =>
        @trigger 'moveend' if invokeEndEvent
      to = null

      top = @currentSlideTop()

      # check if top is over
      overMax = top > @_maxTop
      belowMin = top < @_minTop
      unless overMax or belowMin
        triggerEvent()
        return this

      # normalize top
      to = @_maxTop if overMax
      to = @_minTop if belowMin

      # then do slide
      @slide to, true, =>
        triggerEvent()
      
      return this

    _handleTooNarrow: ->
      if @isInnerTooNarrow()
        @disable()
        @$inner.css 'top', 0
      else
        @enable()
      return this

    isInnerTooNarrow: ->
      elH = @$el.height()
      innerH = @$inner.height()
      innerH <= elH

    disable: ->
      @disabled = true
      return this

    enable: ->
      @disabled = false
      return this

    slide: (val, animate=false, callback) ->

      val = @_maxTop if val > @_maxTop
      val = @_minTop if val < @_minTop

      d = @options.backanim_duration
      e = @options.backanim_easing

      to =
        top: val

      return $.Deferred (defer) =>
        @trigger 'beforeslide'
        onDone = =>
          @trigger 'afterslide'
          callback?()
          defer.resolve()
        if animate
          @$inner.stop().animate to, d, e, => onDone()
        else
          @$inner.stop().css to
          onDone()
      .promise()

    currentSlideTop: ->
      ns.getTopPx @$inner

    updateInnerHeight: (val) ->
      @$inner.height val
      return this

  # ============================================================
  # TouchdragvFitty

  class ns.TouchdragvFitty extends ns.Event
    
    defaults:
      item: null # selector
      beforefirstfresh: null # fn
      startindex: 0
      triggerrefreshimmediately: true

    constructor: (@$el, options) ->
      @options = $.extend {}, @defaults, options
      @currentIndex = @options.startindex
      @_preparetouchdragv()
      @refresh() if @options.triggerrefreshimmediately
    
    _preparetouchdragv: ->
    
      options = $.extend {}, @options
      options.triggerrefreshimmediately = false

      options.beforefirstrefresh = (touchdragv) =>

        touchdragv.once 'firstrefresh', =>
          @options.beforefirstrefresh?(this)
          @trigger 'firstrefresh', this
          @_firstRefreshDone = true

        touchdragv.on 'refresh', => @trigger 'refresh'
        touchdragv.on 'slidecancel', => @trigger 'slidecancel'
        touchdragv.on 'dragstart', => @trigger 'dragstart'
        touchdragv.on 'drag', => @trigger 'drag'
        touchdragv.on 'dragend', => @trigger 'dragend'

        touchdragv.on 'moveend', =>
          slidedDistance = -touchdragv.currentSlideTop()
          itemH = @$el.innerHeight()
          nextIndex = null
          caliculatedIndex = slidedDistance / itemH
          if caliculatedIndex < @currentIndex
            nextIndex = @currentIndex - 1
          else if caliculatedIndex > @currentIndex
            nextIndex = @currentIndex + 1
          unless nextIndex is null
            @updateIndex nextIndex
            @adjustToFit itemH, true
      @_touchdragv = new ns.TouchdragvEl @$el, options
      return this
      
    updateIndex: (index) ->
      unless 0 <= index < @$items.length
        return false
      lastIndex = @currentIndex
      @currentIndex = index
      if lastIndex isnt index
        data =
          index: @currentIndex
        @trigger 'indexchange', data
      return true

    refresh: ->
      @$items = @$el.find @options.item
      itemH = @_itemHeight = @$el.innerHeight()
      innerH = (itemH * @$items.length)
      @_touchdragv.updateInnerHeight innerH
      @$items.height itemH
      @_touchdragv.refresh()
      @adjustToFit itemH
      return this

    adjustToFit: (itemHeight, animate=false, callback) ->
      itemHeight = @$items.height() unless itemHeight?
      return $.Deferred (defer) =>
        i = @currentIndex
        top_after = -itemHeight * i
        top_pre = @_touchdragv.currentSlideTop()
        if top_after is top_pre
          defer.resolve()
          return this
        @trigger 'slidestart' unless @_sliding
        @_sliding = true
        @_touchdragv.slide top_after, animate, =>
          @_sliding = false
          data =
            index: @currentIndex
          @trigger 'slideend', data
          callback?()
          defer.resolve()
      .promise()

    to: (index, animate=false) ->
      updated = @updateIndex (index)
      return $.Deferred (defer) =>
        if updated
          @adjustToFit null, animate, => defer.resolve()
        else
          @trigger 'invalidindexrequested'
          defer.resolve()
      .promise()

    next: (animate=false) ->
      return @to (@currentIndex + 1), animate

    prev: (animate=false) ->
      return @to (@currentIndex - 1), animate
    

  # ============================================================
  # bridge to plugin

  $.fn.touchdragv = (options) ->
    @each (i, el) ->
      $el = $(el)
      instance = new ns.TouchdragvEl $el, options
      $el.data 'touchdragv', instance
      return

  $.fn.touchdragvfitty = (options) ->
    @each (i, el) ->
      $el = $(el)
      instance = new ns.TouchdragvFitty $el, options
      $el.data 'touchdragvfitty', instance
      return

  $.Touchdragv = ns.touchdragvEl
  $.TouchdragvFitty = ns.touchdragvFitty

