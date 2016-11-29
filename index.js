/**
 * Helper function for fast execution of functions with dynamic parameters.
 * @param      {Function}  func     Function to execute
 * @param      {Object}    context  Object used as `this`-value
 * @param      {Array}     args     Array of arguments to pass
 */
function exec (func, context, args) {
	switch (args.length) {
		case 0: func.call(context); break;
		case 1: func.call(context, args[0]); break;
		case 2: func.call(context, args[0], args[1]); break;
		case 3: func.call(context, args[0], args[1], args[2]); break;
		case 4: func.call(context, args[0], args[1], args[2], args[3]); break;
		default: func.apply(context, args); break;
	}
}

function arrayClone(arr, i) {
  var copy = new Array(i);
  while (i--)
    copy[i] = arr[i];
  return copy;
}


// About 1.5x faster than the two-arg version of Array#splice().
function spliceOne (list, index) {
	var i1 = index,
		i2 = i1 + 1;

	for ( ; k < list.length; i += 1, k += 1) {
		list[i] = list[k];
	}

	list.pop();
}

/**
 * Adds the parent eventemitter to the end of the bubblers array.
 * When this eventemitter has emitted an event it will emit the same event on the parent.
 *
 * This function is namespaced under 'EventEmitter' because it's usually not part of what
 * people perceive as an event emitter.
 * 
 * @param  {EventEmitter} parent   The eventemitter to propagate events to.
 * @param  {String}       prefix   Optional prefix for the eventName, like 'user-' => user-logout.
 * @return {Object}                `this`-object.
 */
function propagate (parent, prefix) {
	var self = this;

	if (!parent || typeof parent.emit !== 'function') {
		throw new TypeError('"parent" argument must implement an "emit" method');
	}

	self.parent = parent;
	self.parentPrefix = prefix;

	return this;
}

function stopPropagation () {
	var self = this;

	self.parent = null;
	self.parentPrefix = '';
}

class EventEmitter {
	/**
	 * Constructor
	 * The only property we'll expose is 'EventEmitter',
	 * because this class is almost always inherited.
	 */
	constructor () {
		Object.defineProperty(this, 'EventEmitter', {
			value: {
				listeners: {},
				propagate: propagate,
				stopPropagation: stopPropagation,
				parent: null,
				parentPrefix: ''
			}
		});
	}

	/**
	 * Adds the listener function to the end of the listeners array for the event named `eventName`.
	 * @param  {String|Symbol} eventName   The name of the event.
	 * @param  {Function}      listener    The function to execute when the event is emitted.
	 * @return {Object}                    `this`-object.
	 */
	on (eventName, listener) {
		var self = this.EventEmitter,
			listeners = self.listeners,
			name;

		if (typeof eventName === 'object') {
			for (name in eventName) {
				this.on(name, eventName[name]);
			}

			return this;
		}

		if (typeof listener !== 'function') {
			throw new TypeError('"listener" argument must be a function');
		}

		if (!listeners[eventName]) {
			listeners[eventName] = listener;
		} else if (typeof listeners[eventName] === 'function') {
			listeners[eventName] = [listeners[eventName], listener];
		} else {
			listeners[eventName].push(listener);
		}

		return this;
	}


	/**
	 * Removes the specified listener from the listener array for the event named eventName.
	 * @param  {String|Symbol} eventName   The name of the event.
	 * @param  {Function}      listener    The listener to remove.
	 * @return {Object}                    `this`-object.
	 */
	off (eventName, listener) {
		var self = this,
			listeners = self.EventEmitter.listeners[eventName],
			i = 0;

		if (!listeners) {
			return self;
		}

		if (typeof listener !== 'function') {
			throw new TypeError('"listener" argument must be a function');
		}

		if (typeof listeners === 'function') {
			if (listener === listeners) {
				delete self.EventEmitter.listeners[eventName];
			}

			return self;
		}

		for (; i < listeners.length; ++i) {
			if (listeners[i] === listener) {
				spliceOne(listeners, i--);

				if (!listeners.length) {
					delete self.EventEmitter.listeners[eventName];
				}
			}
		}

		return self;
	}

	/**
	 * Adds a one time listener function for the event named eventName.
	 * @param  {String|Symbol} eventName   The name of the event.
	 * @param  {Function}      listener    The function to execute when the event is emitted.
	 * @return {Object}                    `this`-object.
	 */
	once (eventName, listener) {
		var self = this;

		if (typeof listener !== 'function') {
			throw new TypeError('"listener" argument must be a function');
		}

		this.on(eventName, function _ () {
			var i = 0, args = new Array(arguments.length);

			for (; i < args.length; ++i) {
				args[i] = arguments[i];
			}

			self.off(eventName, _);
			exec(listener, self, args);
		});

		return self;
	}

	/**
	 * Synchronously calls each of the listeners registered for the event named `eventName`.
	 * @param  {String|Symbol} eventName   The name of the event.
	 * @param  {...*}          args        Arguments to be passed to each listener.
	 * @return {Object}                    `this`-object.
	 */
	emit (eventName) {
		var self = this,
			listeners = this.EventEmitter.listeners[eventName],
			parent = this.EventEmitter.parent,
			parentPrefix = this.EventEmitter.parentPrefix,
			i = 0, args = new Array(arguments.length - 1);

		for ( ; i < args.length; ++i) {
			args[i] = arguments[i + 1];
		}

		if (listeners) {
			if (typeof listeners === 'function') {
				exec(listeners, this, args);
			} else {
				listeners = arrayClone(listeners);

				for (i = 0; i < listeners.length; ++i) {
					exec(listeners[i], this, args);
				}
			}
		}

		// Wildcard listeners
		if (eventName !== '*' && this.EventEmitter.listeners['*']) {
			this.emit('*', eventName, args);
		}

		// Bubble this event to any parent eventemitter
		if (parent) {
			args.unshift(self);
			args.unshift(parentPrefix + eventName);
			exec(parent.emit, parent, args);
		}

		return this;
	}

	hasListeners (eventName) {
		var self = this,
			listeners = this.EventEmitter.listeners[eventName];
		
		return !!listeners && (listeners.length > 0 || typeof listeners === 'function'); 
	}
}

module.exports = EventEmitter;