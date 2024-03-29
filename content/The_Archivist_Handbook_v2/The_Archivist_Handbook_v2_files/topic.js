var cur_topic_id, cur_msg_id, buff_subject, cur_subject_div, in_edit_mode = 0;
var hide_prefixes = Array();

function modify_topic(topic_id, first_msg_id)
{
	if (!('XMLHttpRequest' in window))
		return;

	if ('opera' in window)
	{
		var oTest = new XMLHttpRequest();
		if (!('setRequestHeader' in oTest))
			return;
	}

	// Add backwards compatibility with old themes.
	if (typeof(cur_session_var) == 'undefined')
		cur_session_var = 'sesc';

	if (in_edit_mode == 1)
	{
		if (cur_topic_id == topic_id)
			return;
		else
			modify_topic_cancel();
	}

	in_edit_mode = 1;
	mouse_on_div = 1;
	cur_topic_id = topic_id;

	if (typeof window.ajax_indicator == "function")
		ajax_indicator(true);
	getXMLDocument(smf_prepareScriptUrl(smf_scripturl) + "action=quotefast;quote=" + first_msg_id + ";modify;xml", onDocReceived_modify_topic);
}

function onDocReceived_modify_topic(XMLDoc)
{
	cur_msg_id = XMLDoc.getElementsByTagName("message")[0].getAttribute("id");

	cur_subject_div = document.getElementById('msg_' + cur_msg_id.substr(4));
	buff_subject = getInnerHTML(cur_subject_div);

	// Here we hide any other things they want hiding on edit.
	set_hidden_topic_areas('none');

	modify_topic_show_edit(XMLDoc.getElementsByTagName("subject")[0].childNodes[0].nodeValue);
	if (typeof window.ajax_indicator == "function")
		ajax_indicator(false);
}

function modify_topic_cancel()
{
	setInnerHTML(cur_subject_div, buff_subject);
	set_hidden_topic_areas('');

	in_edit_mode = 0;
	return false;
}

function modify_topic_save(cur_session_id, cur_session_var)
{
	if (!in_edit_mode)
		return true;

	// Add backwards compatibility with old themes.
	if (typeof(cur_session_var) == 'undefined')
		cur_session_var = 'sesc';

	var i, x = new Array();
	x[x.length] = 'subject=' + document.forms.quickModForm['subject'].value.replace(/&#/g, "&#38;#").php_to8bit().php_urlencode();
	x[x.length] = 'topic=' + parseInt(document.forms.quickModForm.elements['topic'].value);
	x[x.length] = 'msg=' + parseInt(document.forms.quickModForm.elements['msg'].value);

	if (typeof window.ajax_indicator == "function")
		ajax_indicator(true);
	sendXMLDocument(smf_prepareScriptUrl(smf_scripturl) + "action=jsmodify;topic=" + parseInt(document.forms.quickModForm.elements['topic'].value) + ";" + cur_session_var + "=" + cur_session_id + ";xml", x.join("&"), modify_topic_done);

	return false;
}

function modify_topic_done(XMLDoc)
{
	if (!XMLDoc)
	{
		modify_topic_cancel();
		return true;
	}

	var message = XMLDoc.getElementsByTagName("smf")[0].getElementsByTagName("message")[0];
	var subject = message.getElementsByTagName("subject")[0];
	var error = message.getElementsByTagName("error")[0];

	if (typeof window.ajax_indicator == "function")
		ajax_indicator(false);

	if (!subject || error)
		return false;

	subjectText = subject.childNodes[0].nodeValue;

	modify_topic_hide_edit(subjectText);

	set_hidden_topic_areas('');

	in_edit_mode = 0;

	return false;
}

// Simply restore any hidden bits during topic editing.
function set_hidden_topic_areas(set_style)
{
	for (var i = 0; i < hide_prefixes.length; i++)
	{
		if (document.getElementById(hide_prefixes[i] + cur_msg_id.substr(4)) != null)
			document.getElementById(hide_prefixes[i] + cur_msg_id.substr(4)).style.display = set_style;
	}
}

// *** QuickReply object.
function QuickReply(oOptions)
{
	this.opt = oOptions;
	this.bCollapsed = this.opt.bDefaultCollapsed;
}

// When a user presses quote, put it in the quick reply box (if expanded).
QuickReply.prototype.quote = function (iMessageId, xDeprecated)
{
	// Compatibility with older templates.
	if (typeof(xDeprecated) != 'undefined')
		return true;

	if (this.bCollapsed)
	{
		window.location.href = smf_prepareScriptUrl(this.opt.sScriptUrl) + 'action=post;quote=' + iMessageId + ';topic=' + this.opt.iTopicId + '.' + this.opt.iStart;
		return false;
	}
	else
	{
		// Doing it the XMLhttp way?
		if (window.XMLHttpRequest)
		{
			ajax_indicator(true);
			getXMLDocument(smf_prepareScriptUrl(this.opt.sScriptUrl) + 'action=quotefast;quote=' + iMessageId + ';xml', this.onQuoteReceived);
		}
		// Or with a smart popup!
		else
			reqWin(smf_prepareScriptUrl(this.opt.sScriptUrl) + 'action=quotefast;quote=' + iMessageId, 240, 90);

		// Move the view to the quick reply box.
		if (navigator.appName == 'Microsoft Internet Explorer')
			window.location.hash = this.opt.sJumpAnchor;
		else
			window.location.hash = '#' + this.opt.sJumpAnchor;

		return false;
	}
}

// This is the callback function used after the XMLhttp request.
QuickReply.prototype.onQuoteReceived = function (oXMLDoc)
{
	var sQuoteText = '';

	for (var i = 0; i < oXMLDoc.getElementsByTagName('quote')[0].childNodes.length; i++)
		sQuoteText += oXMLDoc.getElementsByTagName('quote')[0].childNodes[i].nodeValue;

	replaceText(sQuoteText, document.forms.postmodify.message);

	ajax_indicator(false);
}

// The function handling the swapping of the quick reply.
QuickReply.prototype.swap = function ()
{
	document.getElementById(this.opt.sImageId).src = this.opt.sImagesUrl + "/" + (this.bCollapsed ? this.opt.sImageCollapsed : this.opt.sImageExpanded);
	document.getElementById(this.opt.sContainerId).style.display = this.bCollapsed ? '' : 'none';

	this.bCollapsed = !this.bCollapsed;
}

// *** QuickModify object.
function QuickModify(oOptions)
{
	this.opt = oOptions;
	this.bInEditMode = false;
	this.sCurMessageId = '';
	this.oCurMessageDiv = null;
	this.oCurSubjectDiv = null;
	this.sMessageBuffer = '';
	this.sSubjectBuffer = '';
	this.bXmlHttpCapable = this.isXmlHttpCapable();

	// Show the edit buttons
	if (this.bXmlHttpCapable)
	{
		for (var i = document.images.length - 1; i >= 0; i--)
			if (document.images[i].id.substr(0, 14) == 'modify_button_')
				document.images[i].style.display = '';
	}
}

// Determine whether the quick modify can actually be used.
QuickModify.prototype.isXmlHttpCapable = function ()
{
	if (typeof(window.XMLHttpRequest) == 'undefined')
		return false;

	// Opera didn't always support POST requests. So test it first.
	if ('opera' in window)
	{
		var oTest = new XMLHttpRequest();
		if (!('setRequestHeader' in oTest))
			return false;
	}

	return true;
}

// Function called when a user presses the edit button.
QuickModify.prototype.modifyMsg = function (iMessageId)
{
	if (!this.bXmlHttpCapable)
		return;

	// Add backwards compatibility with old themes.
	if (typeof(sSessionVar) == 'undefined')
		sSessionVar = 'sesc';

	// First cancel if there's another message still being edited.
	if (this.bInEditMode)
		this.modifyCancel();

	// At least NOW we're in edit mode
	this.bInEditMode = true;

	// Send out the XMLhttp request to get more info
	ajax_indicator(true);

	// For IE 5.0 support, 'call' is not yet used.
	this.tmpMethod = getXMLDocument;
	this.tmpMethod(smf_prepareScriptUrl(this.opt.sScriptUrl) + 'action=quotefast;quote=' + iMessageId + ';modify;xml', this.onMessageReceived);
	delete this.tmpMethod;
}

// The callback function used for the XMLhttp request retrieving the message.
QuickModify.prototype.onMessageReceived = function (XMLDoc)
{
	var sBodyText = '', sSubjectText = '';

	// No longer show the 'loading...' sign.
	ajax_indicator(false);

	// Grab the message ID.
	this.sCurMessageId = XMLDoc.getElementsByTagName('message')[0].getAttribute('id');

	// If this is not valid then simply give up.
	if (!document.getElementById(this.sCurMessageId))
		return this.modifyCancel();

	// Replace the body part.
	for (var i = 0; i < XMLDoc.getElementsByTagName("message")[0].childNodes.length; i++)
		sBodyText += XMLDoc.getElementsByTagName("message")[0].childNodes[i].nodeValue;
	this.oCurMessageDiv = document.getElementById(this.sCurMessageId);
	this.sMessageBuffer = getInnerHTML(this.oCurMessageDiv);

	// We have to force the body to lose its dollar signs thanks to IE.
	sBodyText = sBodyText.replace(/\$/g, '{&dollarfix;$}');

	// Actually create the content, with a bodge for disappearing dollar signs.
	setInnerHTML(this.oCurMessageDiv, this.opt.sTemplateBodyEdit.replace(/%msg_id%/g, this.sCurMessageId.substr(4)).replace(/%body%/, sBodyText).replace(/\{&dollarfix;\$\}/g, '$'));

	// Replace the subject part.
	this.oCurSubjectDiv = document.getElementById('subject_' + this.sCurMessageId.substr(4));
	this.sSubjectBuffer = getInnerHTML(this.oCurSubjectDiv);

	sSubjectText = XMLDoc.getElementsByTagName('subject')[0].childNodes[0].nodeValue.replace(/\$/g, '{&dollarfix;$}');
	setInnerHTML(this.oCurSubjectDiv, this.opt.sTemplateSubjectEdit.replace(/%subject%/, sSubjectText).replace(/\{&dollarfix;\$\}/g, '$'));

	return true;
}

// Function in case the user presses cancel (or other circumstances cause it).
QuickModify.prototype.modifyCancel = function ()
{
	// Roll back the HTML to its original state.
	if (this.oCurMessageDiv)
	{
		setInnerHTML(this.oCurMessageDiv, this.sMessageBuffer);
		setInnerHTML(this.oCurSubjectDiv, this.sSubjectBuffer);
	}

	// No longer in edit mode, that's right.
	this.bInEditMode = false;

	return false;
}

// The function called after a user wants to save his precious message.
QuickModify.prototype.modifySave = function (sSessionId, sSessionVar)
{
	// We cannot save if we weren't in edit mode.
	if (!this.bInEditMode)
		return true;

	// Add backwards compatibility with old themes.
	if (typeof(sSessionVar) == 'undefined')
		sSessionVar = 'sesc';

	var i, x = new Array();
	x[x.length] = 'subject=' + escape(document.forms.quickModForm['subject'].value.replace(/&#/g, "&#38;#").php_to8bit()).replace(/\+/g, "%2B");
	x[x.length] = 'message=' + escape(document.forms.quickModForm['message'].value.replace(/&#/g, "&#38;#").php_to8bit()).replace(/\+/g, "%2B");
	x[x.length] = 'topic=' + parseInt(document.forms.quickModForm.elements['topic'].value);
	x[x.length] = 'msg=' + parseInt(document.forms.quickModForm.elements['msg'].value);

	// Send in the XMLhttp request and let's hope for the best.
	ajax_indicator(true);
	sendXMLDocument.call(this, smf_prepareScriptUrl(this.opt.sScriptUrl) + "action=jsmodify;topic=" + this.opt.iTopicId + ";" + sSessionVar + "=" + sSessionId + ";xml", x.join("&"), this.onModifyDone);

	return false;
}

// Callback function of the XMLhttp request sending the modified message.
QuickModify.prototype.onModifyDone = function (XMLDoc)
{
	// We've finished the loading stuff.
	ajax_indicator(false);

	// If we didn't get a valid document, just cancel.
	if (!XMLDoc || !XMLDoc.getElementsByTagName('smf')[0])
	{
		// Mozilla will nicely tell us what's wrong.
		if (XMLDoc.childNodes.length > 0 && XMLDoc.firstChild.nodeName == 'parsererror')
			setInnerHTML(document.getElementById('error_box'), XMLDoc.firstChild.textContent);
		else
			this.modifyCancel();
		return;
	}

	var message = XMLDoc.getElementsByTagName('smf')[0].getElementsByTagName('message')[0];
	var body = message.getElementsByTagName('body')[0];
	var error = message.getElementsByTagName('error')[0];

	if (body)
	{
		// Show new body.
		var bodyText = '';
		for (var i = 0; i < body.childNodes.length; i++)
			bodyText += body.childNodes[i].nodeValue;

		this.sMessageBuffer = this.opt.sTemplateBodyNormal.replace(/%body%/, bodyText.replace(/\$/g, '{&dollarfix;$}')).replace(/\{&dollarfix;\$\}/g,'$');
		setInnerHTML(this.oCurMessageDiv, this.sMessageBuffer);

		// Show new subject.
		var oSubject = message.getElementsByTagName('subject')[0];
		var sSubjectText = oSubject.childNodes[0].nodeValue.replace(/\$/g, '{&dollarfix;$}');
		this.sSubjectBuffer = this.opt.sTemplateSubjectNormal.replace(/%msg_id%/g, this.sCurMessageId.substr(4)).replace(/%subject%/, sSubjectText).replace(/\{&dollarfix;\$\}/g,'$');
		setInnerHTML(this.oCurSubjectDiv, this.sSubjectBuffer);

		// If this is the first message, also update the topic subject.
		if (oSubject.getAttribute('is_first') == '1')
			setInnerHTML(document.getElementById('top_subject'), this.opt.sTemplateTopSubject.replace(/%subject%/, sSubjectText).replace(/\{&dollarfix;\$\}/g, '$'));

		// Show this message as 'modified on x by y'.
		if (this.opt.bShowModify)
			setInnerHTML(document.getElementById('modified_' + this.sCurMessageId.substr(4)), message.getElementsByTagName('modified')[0].childNodes[0].nodeValue);
	}
	else if (error)
	{
		setInnerHTML(document.getElementById('error_box'), error.childNodes[0].nodeValue);
		document.forms.quickModForm.message.style.border = error.getAttribute('in_body') == '1' ? this.opt.sErrorBorderStyle : '';
		document.forms.quickModForm.subject.style.border = error.getAttribute('in_subject') == '1' ? this.opt.sErrorBorderStyle : '';
	}
}

function InTopicModeration(oOptions)
{
	this.opt = oOptions;
	this.bButtonsShown = false;
	this.iNumSelected = 0;

	// Add backwards compatibility with old themes.
	if (typeof(this.opt.sSessionVar) == 'undefined')
		this.opt.sSessionVar = 'sesc';

	this.init();
}

InTopicModeration.prototype.init = function()
{
	// Add checkboxes to all the messages.
	for (var i = 0, n = this.opt.aMessageIds.length; i < n; i++)
	{
		// Create the checkbox.
		var oCheckbox = document.createElement('input');
		oCheckbox.type = 'checkbox';
		oCheckbox.className = 'input_check';
		oCheckbox.name = 'msgs[]';
		oCheckbox.value = this.opt.aMessageIds[i];
		oCheckbox.instanceRef = this;
		oCheckbox.onclick = function () {
			this.instanceRef.handleClick(this);
		}

		// Append it to the container
		var oCheckboxContainer = document.getElementById(this.opt.sCheckboxContainerMask + this.opt.aMessageIds[i]);
		oCheckboxContainer.appendChild(oCheckbox);
		oCheckboxContainer.style.display = '';
	}
}

InTopicModeration.prototype.handleClick = function(oCheckbox)
{
	if (!this.bButtonsShown && this.opt.sButtonStripDisplay)
	{
		var oButtonStrip = document.getElementById(this.opt.sButtonStrip);
		var oButtonStripDisplay = document.getElementById(this.opt.sButtonStripDisplay);

		// Make sure it can go somewhere.
		if (typeof(oButtonStripDisplay) == 'object' && oButtonStripDisplay != null)
			oButtonStripDisplay.style.display = "";
		else
		{
			var oNewDiv = document.createElement('div');
			var oNewList = document.createElement('ul');

			oNewDiv.id = this.opt.sButtonStripDisplay;
			oNewDiv.className = this.opt.sButtonStripClass ? this.opt.sButtonStripClass : 'buttonlist floatbottom';

			oNewDiv.appendChild(oNewList);
			oButtonStrip.appendChild(oNewDiv);
		}

		// Add the 'remove selected items' button.
		if (this.opt.bCanRemove)
			smf_addButton(this.opt.sButtonStrip, this.opt.bUseImageButton, {
				sId: this.opt.sSelf + '_remove_button',
				sText: this.opt.sRemoveButtonLabel,
				sImage: this.opt.sRemoveButtonImage,
				sUrl: '#',
				sCustom: ' onclick="return ' + this.opt.sSelf + '.handleSubmit(\'remove\')"'
			});

		// Add the 'restore selected items' button.
		if (this.opt.bCanRestore)
			smf_addButton(this.opt.sButtonStrip, this.opt.bUseImageButton, {
				sId: this.opt.sSelf + '_restore_button',
				sText: this.opt.sRestoreButtonLabel,
				sImage: this.opt.sRestoreButtonImage,
				sUrl: '#',
				sCustom: ' onclick="return ' + this.opt.sSelf + '.handleSubmit(\'restore\')"'
			});

		// Adding these buttons once should be enough.
		this.bButtonsShown = true;
	}

	// Keep stats on how many items were selected.
	this.iNumSelected += oCheckbox.checked ? 1 : -1;

	// Show the number of messages selected in the button.
	if (this.opt.bCanRemove && !this.opt.bUseImageButton)
	{
		setInnerHTML(document.getElementById(this.opt.sSelf + '_remove_button'), this.opt.sRemoveButtonLabel + ' [' + this.iNumSelected + ']');
		document.getElementById(this.opt.sSelf + '_remove_button').style.display = this.iNumSelected < 1 ? "none" : "";
	}

	if (this.opt.bCanRestore && !this.opt.bUseImageButton)
	{
		setInnerHTML(document.getElementById(this.opt.sSelf + '_restore_button'), this.opt.sRestoreButtonLabel + ' [' + this.iNumSelected + ']');
		document.getElementById(this.opt.sSelf + '_restore_button').style.display = this.iNumSelected < 1 ? "none" : "";
	}

	// Try to restore the correct position.
	var aItems = document.getElementById(this.opt.sButtonStrip).getElementsByTagName('span');
	if (aItems.length > 3)
	{
		if (this.iNumSelected < 1)
		{
			aItems[aItems.length - 3].className = aItems[aItems.length - 3].className.replace(/\s*position_holder/, 'last');
			aItems[aItems.length - 2].className = aItems[aItems.length - 2].className.replace(/\s*position_holder/, 'last');
		}
		else
		{
			aItems[aItems.length - 2].className = aItems[aItems.length - 2].className.replace(/\s*last/, 'position_holder');
			aItems[aItems.length - 3].className = aItems[aItems.length - 3].className.replace(/\s*last/, 'position_holder');
		}
	}
}

InTopicModeration.prototype.handleSubmit = function (sSubmitType)
{
	var oForm = document.getElementById(this.opt.sFormId);

	// Make sure this form isn't submitted in another way than this function.
	var oInput = document.createElement('input');
	oInput.type = 'hidden';
	oInput.name = this.opt.sSessionVar;
	oInput.value = this.opt.sSessionId;
	oForm.appendChild(oInput);

	switch (sSubmitType)
	{
		case 'remove':
			if (!confirm(this.opt.sRemoveButtonConfirm))
				return false;

			oForm.action = oForm.action.replace(/;restore_selected=1/, '');
		break;

		case 'restore':
			if (!confirm(this.opt.sRestoreButtonConfirm))
				return false;

			oForm.action = oForm.action + ';restore_selected=1';
		break;

		default:
			return false;
		break;
	}

	oForm.submit();
	return true;
}


// *** Other functions...
function expandThumb(thumbID)
{
	var img = document.getElementById('thumb_' + thumbID);
	var link = document.getElementById('link_' + thumbID);
	var tmp = img.src;
	img.src = link.href;
	link.href = tmp;
	img.style.width = '';
	img.style.height = '';
	return false;
}

/*
  SortTable
  version 2
  7th April 2007
  Stuart Langridge, http://www.kryogenix.org/code/browser/sorttable/
  
  Instructions:
  Download this file
  Add <script src="sorttable.js"></script> to your HTML
  Add class="sortable" to any table you'd like to make sortable
  Click on the headers to sort
  
  Thanks to many, many people for contributions and suggestions.
  Licenced as X11: http://www.kryogenix.org/code/browser/licence.html
  This basically means: do what you want with it.
*/

 
var stIsIE = /*@cc_on!@*/false;

sorttable = {
  init: function() {
	 // quit if this function has already been called
	 if (arguments.callee.done) return;
	 // flag this function so we don't do the same thing twice
	 arguments.callee.done = true;
	 // kill the timer
	 if (_timer) clearInterval(_timer);
	 
	 if (!document.createElement || !document.getElementsByTagName) return;
	 
	 sorttable.DATE_RE = /^(\d\d?)[\/\.-](\d\d?)[\/\.-]((\d\d)?\d\d)$/;
	 
	 forEach(document.getElementsByTagName('table'), function(table) {
		if (table.className.search(/\bsortable\b/) != -1) {
		  sorttable.makeSortable(table);
		}
	 });
	 
  },
  
  makeSortable: function(table) {
	 if (table.getElementsByTagName('thead').length == 0) {
		// table doesn't have a tHead. Since it should have, create one and
		// put the first table row in it.
		the = document.createElement('thead');
		the.appendChild(table.rows[0]);
		table.insertBefore(the,table.firstChild);
	 }
	 // Safari doesn't support table.tHead, sigh
	 if (table.tHead == null) table.tHead = table.getElementsByTagName('thead')[0];
	 
	 if (table.tHead.rows.length != 1) return; // can't cope with two header rows
	 
	 // Sorttable v1 put rows with a class of "sortbottom" at the bottom (as
	 // "total" rows, for example). This is B&R, since what you're supposed
	 // to do is put them in a tfoot. So, if there are sortbottom rows,
	 // for backwards compatibility, move them to tfoot (creating it if needed).
	 sortbottomrows = [];
	 for (var i=0; i<table.rows.length; i++) {
		if (table.rows[i].className.search(/\bsortbottom\b/) != -1) {
		  sortbottomrows[sortbottomrows.length] = table.rows[i];
		}
	 }
	 if (sortbottomrows) {
		if (table.tFoot == null) {
		  // table doesn't have a tfoot. Create one.
		  tfo = document.createElement('tfoot');
		  table.appendChild(tfo);
		}
		for (var i=0; i<sortbottomrows.length; i++) {
		  tfo.appendChild(sortbottomrows[i]);
		}
		delete sortbottomrows;
	 }
	 
	 // work through each column and calculate its type
	 headrow = table.tHead.rows[0].cells;
	 for (var i=0; i<headrow.length; i++) {
		// manually override the type with a sorttable_type attribute
		if (!headrow[i].className.match(/\bsorttable_nosort\b/)) { // skip this col
		  mtch = headrow[i].className.match(/\bsorttable_([a-z0-9]+)\b/);
		  if (mtch) { override = mtch[1]; }
			if (mtch && typeof sorttable["sort_"+override] == 'function') {
			  headrow[i].sorttable_sortfunction = sorttable["sort_"+override];
			} else {
			  headrow[i].sorttable_sortfunction = sorttable.guessType(table,i);
			}
			// make it clickable to sort
			headrow[i].sorttable_columnindex = i;
			headrow[i].sorttable_tbody = table.tBodies[0];
			dean_addEvent(headrow[i],"click", function(e) {

			 if (this.className.search(/\bsorttable_sorted\b/) != -1) {
				// if we're already sorted by this column, just 
				// reverse the table, which is quicker
				sorttable.reverse(this.sorttable_tbody);
				this.className = this.className.replace('sorttable_sorted',
																	 'sorttable_sorted_reverse');
				this.removeChild(document.getElementById('sorttable_sortfwdind'));
				sortrevind = document.createElement('span');
				sortrevind.id = "sorttable_sortrevind";
				sortrevind.innerHTML = stIsIE ? '&nbsp<font face="webdings">5</font>' : '&nbsp;&#x25B4;';
				this.appendChild(sortrevind);
				return;
			 }
			 if (this.className.search(/\bsorttable_sorted_reverse\b/) != -1) {
				// if we're already sorted by this column in reverse, just 
				// re-reverse the table, which is quicker
				sorttable.reverse(this.sorttable_tbody);
				this.className = this.className.replace('sorttable_sorted_reverse',
																	 'sorttable_sorted');
				this.removeChild(document.getElementById('sorttable_sortrevind'));
				sortfwdind = document.createElement('span');
				sortfwdind.id = "sorttable_sortfwdind";
				sortfwdind.innerHTML = stIsIE ? '&nbsp<font face="webdings">6</font>' : '&nbsp;&#x25BE;';
				this.appendChild(sortfwdind);
				return;
			 }
			 
			 // remove sorttable_sorted classes
			 theadrow = this.parentNode;
			 forEach(theadrow.childNodes, function(cell) {
				if (cell.nodeType == 1) { // an element
				  cell.className = cell.className.replace('sorttable_sorted_reverse','');
				  cell.className = cell.className.replace('sorttable_sorted','');
				}
			 });
			 sortfwdind = document.getElementById('sorttable_sortfwdind');
			 if (sortfwdind) { sortfwdind.parentNode.removeChild(sortfwdind); }
			 sortrevind = document.getElementById('sorttable_sortrevind');
			 if (sortrevind) { sortrevind.parentNode.removeChild(sortrevind); }
			 
			 this.className += ' sorttable_sorted';
			 sortfwdind = document.createElement('span');
			 sortfwdind.id = "sorttable_sortfwdind";
			 sortfwdind.innerHTML = stIsIE ? '&nbsp<font face="webdings">6</font>' : '&nbsp;&#x25BE;';
			 this.appendChild(sortfwdind);

			  // build an array to sort. This is a Schwartzian transform thing,
			  // i.e., we "decorate" each row with the actual sort key,
			  // sort based on the sort keys, and then put the rows back in order
			  // which is a lot faster because you only do getInnerText once per row
			  row_array = [];
			  col = this.sorttable_columnindex;
			  rows = this.sorttable_tbody.rows;
			  for (var j=0; j<rows.length; j++) {
				 row_array[row_array.length] = [sorttable.getInnerText(rows[j].cells[col]), rows[j]];
			  }
			  /* If you want a stable sort, uncomment the following line */
			  //sorttable.shaker_sort(row_array, this.sorttable_sortfunction);
			  /* and comment out this one */
			  row_array.sort(this.sorttable_sortfunction);
			  
			  tb = this.sorttable_tbody;
			  for (var j=0; j<row_array.length; j++) {
				 tb.appendChild(row_array[j][1]);
			  }
			  
			  delete row_array;
			});
		 }
	 }
  },
  
  guessType: function(table, column) {
	 // guess the type of a column based on its first non-blank row
	 sortfn = sorttable.sort_alpha;
	 for (var i=0; i<table.tBodies[0].rows.length; i++) {
		text = sorttable.getInnerText(table.tBodies[0].rows[i].cells[column]);
		if (text != '') {
		  if (text.match(/^-?[�$�]?[\d,.]+%?$/)) {
			 return sorttable.sort_numeric;
		  }
		  // check for a date: dd/mm/yyyy or dd/mm/yy 
		  // can have / or . or - as separator
		  // can be mm/dd as well
		  possdate = text.match(sorttable.DATE_RE)
		  if (possdate) {
			 // looks like a date
			 first = parseInt(possdate[1]);
			 second = parseInt(possdate[2]);
			 if (first > 12) {
				// definitely dd/mm
				return sorttable.sort_ddmm;
			 } else if (second > 12) {
				return sorttable.sort_mmdd;
			 } else {
				// looks like a date, but we can't tell which, so assume
				// that it's dd/mm (English imperialism!) and keep looking
				sortfn = sorttable.sort_ddmm;
			 }
		  }
		}
	 }
	 return sortfn;
  },
  
  getInnerText: function(node) {
	 // gets the text we want to use for sorting for a cell.
	 // strips leading and trailing whitespace.
	 // this is *not* a generic getInnerText function; it's special to sorttable.
	 // for example, you can override the cell text with a customkey attribute.
	 // it also gets .value for <input> fields.
	 
	 if (!node) return "";

	 hasInputs = (typeof node.getElementsByTagName == 'function') &&
					  node.getElementsByTagName('input').length;
	 
	 if (node.getAttribute("sorttable_customkey") != null) {
		return node.getAttribute("sorttable_customkey");
	 }
	 else if (typeof node.textContent != 'undefined' && !hasInputs) {
		return node.textContent.replace(/^\s+|\s+$/g, '');
	 }
	 else if (typeof node.innerText != 'undefined' && !hasInputs) {
		return node.innerText.replace(/^\s+|\s+$/g, '');
	 }
	 else if (typeof node.text != 'undefined' && !hasInputs) {
		return node.text.replace(/^\s+|\s+$/g, '');
	 }
	 else {
		switch (node.nodeType) {
		  case 3:
			 if (node.nodeName.toLowerCase() == 'input') {
				return node.value.replace(/^\s+|\s+$/g, '');
			 }
		  case 4:
			 return node.nodeValue.replace(/^\s+|\s+$/g, '');
			 break;
		  case 1:
		  case 11:
			 var innerText = '';
			 for (var i = 0; i < node.childNodes.length; i++) {
				innerText += sorttable.getInnerText(node.childNodes[i]);
			 }
			 return innerText.replace(/^\s+|\s+$/g, '');
			 break;
		  default:
			 return '';
		}
	 }
  },
  
  reverse: function(tbody) {
	 // reverse the rows in a tbody
	 newrows = [];
	 for (var i=0; i<tbody.rows.length; i++) {
		newrows[newrows.length] = tbody.rows[i];
	 }
	 for (var i=newrows.length-1; i>=0; i--) {
		 tbody.appendChild(newrows[i]);
	 }
	 delete newrows;
  },
  
  /* sort functions
	  each sort function takes two parameters, a and b
	  you are comparing a[0] and b[0] */
  sort_numeric: function(a,b) {
	 aa = parseFloat(a[0].replace(/[^0-9.-]/g,''));
	 if (isNaN(aa)) aa = 0;
	 bb = parseFloat(b[0].replace(/[^0-9.-]/g,'')); 
	 if (isNaN(bb)) bb = 0;
	 return aa-bb;
  },
  sort_alpha: function(a,b) {
	 if (a[0].toLowerCase()==b[0].toLowerCase()) return 0;
	 if (a[0].toLowerCase()<b[0].toLowerCase()) return -1;
	 return 1;
  },
  sort_ddmm: function(a,b) {
	 mtch = a[0].match(sorttable.DATE_RE);
	 y = mtch[3]; m = mtch[2]; d = mtch[1];
	 if (m.length == 1) m = '0'+m;
	 if (d.length == 1) d = '0'+d;
	 dt1 = y+m+d;
	 mtch = b[0].match(sorttable.DATE_RE);
	 y = mtch[3]; m = mtch[2]; d = mtch[1];
	 if (m.length == 1) m = '0'+m;
	 if (d.length == 1) d = '0'+d;
	 dt2 = y+m+d;
	 if (dt1==dt2) return 0;
	 if (dt1<dt2) return -1;
	 return 1;
  },
  sort_mmdd: function(a,b) {
	 mtch = a[0].match(sorttable.DATE_RE);
	 y = mtch[3]; d = mtch[2]; m = mtch[1];
	 if (m.length == 1) m = '0'+m;
	 if (d.length == 1) d = '0'+d;
	 dt1 = y+m+d;
	 mtch = b[0].match(sorttable.DATE_RE);
	 y = mtch[3]; d = mtch[2]; m = mtch[1];
	 if (m.length == 1) m = '0'+m;
	 if (d.length == 1) d = '0'+d;
	 dt2 = y+m+d;
	 if (dt1==dt2) return 0;
	 if (dt1<dt2) return -1;
	 return 1;
  },
  
  shaker_sort: function(list, comp_func) {
	 // A stable sort function to allow multi-level sorting of data
	 // see: http://en.wikipedia.org/wiki/Cocktail_sort
	 // thanks to Joseph Nahmias
	 var b = 0;
	 var t = list.length - 1;
	 var swap = true;

	 while(swap) {
		  swap = false;
		  for(var i = b; i < t; ++i) {
				if ( comp_func(list[i], list[i+1]) > 0 ) {
					 var q = list[i]; list[i] = list[i+1]; list[i+1] = q;
					 swap = true;
				}
		  } // for
		  t--;

		  if (!swap) break;

		  for(var i = t; i > b; --i) {
				if ( comp_func(list[i], list[i-1]) < 0 ) {
					 var q = list[i]; list[i] = list[i-1]; list[i-1] = q;
					 swap = true;
				}
		  } // for
		  b++;

	 } // while(swap)
  }  
}

/* ******************************************************************
	Supporting functions: bundled here to avoid depending on a library
	****************************************************************** */

// Dean Edwards/Matthias Miller/John Resig

/* for Mozilla/Opera9 */
if (document.addEventListener) {
	 document.addEventListener("DOMContentLoaded", sorttable.init, false);
}

/* for Internet Explorer */
/*@cc_on @*/
/*@if (@_win32)
	 document.write("<script id=__ie_onload defer src=javascript:void(0)><\/script>");
	 var script = document.getElementById("__ie_onload");
	 script.onreadystatechange = function() {
		  if (this.readyState == "complete") {
				sorttable.init(); // call the onload handler
		  }
	 };
/*@end @*/

/* for Safari */
if (/WebKit/i.test(navigator.userAgent)) { // sniff
	 var _timer = setInterval(function() {
		  if (/loaded|complete/.test(document.readyState)) {
				sorttable.init(); // call the onload handler
		  }
	 }, 10);
}

/* for other browsers */
window.onload = sorttable.init;

// written by Dean Edwards, 2005
// with input from Tino Zijdel, Matthias Miller, Diego Perini

// http://dean.edwards.name/weblog/2005/10/add-event/

function dean_addEvent(element, type, handler) {
	if (element.addEventListener) {
		element.addEventListener(type, handler, false);
	} else {
		// assign each event handler a unique ID
		if (!handler.$$guid) handler.$$guid = dean_addEvent.guid++;
		// create a hash table of event types for the element
		if (!element.events) element.events = {};
		// create a hash table of event handlers for each element/event pair
		var handlers = element.events[type];
		if (!handlers) {
			handlers = element.events[type] = {};
			// store the existing event handler (if there is one)
			if (element["on" + type]) {
				handlers[0] = element["on" + type];
			}
		}
		// store the event handler in the hash table
		handlers[handler.$$guid] = handler;
		// assign a global event handler to do all the work
		element["on" + type] = handleEvent;
	}
};
// a counter used to create unique IDs
dean_addEvent.guid = 1;

function removeEvent(element, type, handler) {
	if (element.removeEventListener) {
		element.removeEventListener(type, handler, false);
	} else {
		// delete the event handler from the hash table
		if (element.events && element.events[type]) {
			delete element.events[type][handler.$$guid];
		}
	}
};

function handleEvent(event) {
	var returnValue = true;
	// grab the event object (IE uses a global event object)
	event = event || fixEvent(((this.ownerDocument || this.document || this).parentWindow || window).event);
	// get a reference to the hash table of event handlers
	var handlers = this.events[event.type];
	// execute each event handler
	for (var i in handlers) {
		this.$$handleEvent = handlers[i];
		if (this.$$handleEvent(event) === false) {
			returnValue = false;
		}
	}
	return returnValue;
};

function fixEvent(event) {
	// add W3C standard event methods
	event.preventDefault = fixEvent.preventDefault;
	event.stopPropagation = fixEvent.stopPropagation;
	return event;
};
fixEvent.preventDefault = function() {
	this.returnValue = false;
};
fixEvent.stopPropagation = function() {
  this.cancelBubble = true;
}

// Dean's forEach: http://dean.edwards.name/base/forEach.js
/*
	forEach, version 1.0
	Copyright 2006, Dean Edwards
	License: http://www.opensource.org/licenses/mit-license.php
*/

// array-like enumeration
if (!Array.forEach) { // mozilla already supports this
	Array.forEach = function(array, block, context) {
		for (var i = 0; i < array.length; i++) {
			block.call(context, array[i], i, array);
		}
	};
}

// generic enumeration
Function.prototype.forEach = function(object, block, context) {
	for (var key in object) {
		if (typeof this.prototype[key] == "undefined") {
			block.call(context, object[key], key, object);
		}
	}
};

// character enumeration
String.forEach = function(string, block, context) {
	Array.forEach(string.split(""), function(chr, index) {
		block.call(context, chr, index, string);
	});
};

// globally resolve forEach enumeration
var forEach = function(object, block, context) {
	if (object) {
		var resolve = Object; // default
		if (object instanceof Function) {
			// functions have a "length" property
			resolve = Function;
		} else if (object.forEach instanceof Function) {
			// the object implements a custom forEach method so use that
			object.forEach(block, context);
			return;
		} else if (typeof object == "string") {
			// the object is a string
			resolve = String;
		} else if (typeof object.length == "number") {
			// the object is array-like
			resolve = Array;
		}
		resolve.forEach(object, block, context);
	}
};
/*
  End SortTable
*/
/*
     FILE ARCHIVED ON 17:50:48 Jun 15, 2015 AND RETRIEVED FROM THE
     INTERNET ARCHIVE ON 22:20:58 Aug 30, 2019.
     JAVASCRIPT APPENDED BY WAYBACK MACHINE, COPYRIGHT INTERNET ARCHIVE.

     ALL OTHER CONTENT MAY ALSO BE PROTECTED BY COPYRIGHT (17 U.S.C.
     SECTION 108(a)(3)).
*/
/*
playback timings (ms):
  exclusion.robots.policy: 0.294
  PetaboxLoader3.datanode: 137.917 (5)
  LoadShardBlock: 67.465 (3)
  exclusion.robots: 0.314
  load_resource: 467.706
  RedisCDXSource: 0.878
  captures_list: 92.719
  PetaboxLoader3.resolve: 376.333 (3)
  CDXLines.iter: 15.716 (3)
  esindex: 0.015
*/