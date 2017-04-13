(function($){
  $.fn.markdown.messages.de = {
    'Bold': "Fett",
    'Italic': "Kursiv",
    'Heading': "Überschrift",
    'URL/Link': "Ein Link einfügen",
    'Image': "Ein Bild einfügen",
    'List': "Aufzählungszeichen",
    'Ordered List': "Nummerierung",
    'Unordered List': "Aufzählungszeichen",
    'Code': "Quellcode",
    'code text here': "",
    'Quote': "Zitat",
    'quote here': "",
    'Preview': "Vorschau",
    'strong text': "",
    'emphasized text': "",
    'heading text': "",
    'enter link description here': "Linkbeschreibung",
    'Insert Hyperlink': "Link zum Webseite",
    'enter image description here': "Bildbeschreibung",
    'Insert Image Hyperlink': "Link zum Bild",
    'enter image title here': "Bildtitel",
    'list text here': "",
    'Save': "Posten"
  };
}(jQuery));

Dropzone.autoDiscover = false;

function toggleMediaSelection(parent) {
	var childs = document.getElementById("mediaList").getElementsByTagName("input");
	for (i = 0; i < childs.length; i++) {
		if (!childs[i].disabled)
			childs[i].checked = parent.checked;
	}
}

function autolinkUrls() {
    $('.hp-post').each(function(){
		$(this).linkify({
			tagName: 'a',
			target: '_blank',
			newLine: '\n',
			linkClass: 'hp-postLink',
			linkAttributes: null
		});
	});
	$('.hp-postLink').each(function(){
        if (!$(this).find("span").length)
			$(this).append(" <span class='glyphicon glyphicon-share-alt'></span>");
	});
}

function linkOlderComments() {
    /*
	 * SHOW OLDER COMMENTS
	 */
	$('.olderComments').each(function(){
		var id = $(this).attr('href').split('-')[1];
		var context = this;
		$(this).click(function(){
			if($(context).hasClass('open')){
				$("#collapse-"+id).collapse('toggle');
				$(context).html("Ältere Kommentare anzeigen...");
				$(context).removeClass('open');
				$(context).addClass('closed');
			}
			else if($(context).hasClass('closed')){
				$("#collapse-"+id).collapse('toggle');
				$(context).html("Ältere Kommentare ausblenden...");
				$(context).removeClass('closed');
				$(context).addClass('open');
			}
			else if($(context).hasClass('unloaded')){
				var currentComments = $('#comments-' + id + ' > .media').length;
				$(context).html("Ältere Kommentare ausblenden...");
				$.ajax({
					url: "/post/olderComments?id=" + id + "&current=" + currentComments,
					type: "GET",
					success: function(data){
						$("#collapse-"+id).html(data);
						$("#collapse-"+id).collapse('toggle');
					}
				});
				$(context).addClass('open');
				$(context).removeClass('unloaded');
			}

			return false;
		});
	});
}

function truncateBreadcrumb() {
	var lastBreadcrumb = $("#hp-navbar-breadcrumb .breadcrumb > li:last-child");
	var index = 3;	// first breadcrumb item which is hidden
	// hide breadcrumb items while last item isn't visible
	while (lastBreadcrumb.length &&
		lastBreadcrumb.position().left + lastBreadcrumb.width() > $("#hp-navbar-breadcrumb .breadcrumb").width()) {
		$("#hp-navbar-breadcrumb #hp-navbar-breadcrumb-truncate").removeClass("hidden");
		$("#hp-navbar-breadcrumb .breadcrumb > li:nth-child("+index+")").addClass("hidden");
		index++;
	}
}

function showAllBreadcrumbItems() {
	$("#hp-navbar-breadcrumb .breadcrumb > li").removeClass("hidden");
	$("#hp-navbar-breadcrumb #hp-navbar-breadcrumb-truncate").addClass("hidden");
}

/** replaces the content of the given element with a loading indicator, and returns the old content (as html) **/
function replaceContentWithLoadingIndicator(element) {
    var old_content = element.html();
    element.html("<div class=\"loading\"></div>");
    element.find(".loading").show();
    return old_content;
}

/** show an error before/above the given element **/
function showErrorBeforeElement(element, error_message) {
    element.before('<div class="alert alert-danger"><a data-dismiss="alert" class="close" href="#">×</a>'+error_message+'</div>');
}

/** markdown post content */
function markdownPostContent() {
    $('.hp-post').each(function( index, value ) {
        // check if element is already marked (pagination issue)
        if (!$(this).hasClass('marked')) {
            this.innerHTML = md.render(value.textContent);
            $(this).addClass('marked');
        }
    });
}

/*
 *  Options Menu
 */
$('body').on('shown.bs.dropdown', '.hp-optionsMenu>div', function() {
    $(this).find('.dropdown-toggle>span').removeClass('glyphicon-chevron-down').addClass('glyphicon-chevron-up');
    var menu = $(this).find('ul.dropdown-menu');
    var row = $(this).parents('tr');
    // hacky: 45 belongs to div.hp-notepad-content.addmargin    
    var top = row.offset().top - $('.hp-notepad-content').offset().top;
    menu.css('top', top + 'px');
});

$('body').on('hidden.bs.dropdown', '.hp-optionsMenu>div', function() {
    $(this).find('.dropdown-toggle>span').removeClass('glyphicon-chevron-up').addClass('glyphicon-chevron-down');
});

$(".hp-optionsTable>tr").bind("contextmenu", function (e) {
    e.preventDefault();
    $(this).find('.hp-optionsMenu .dropdown-toggle').trigger("click");
});

$(".hp-optionsTable>tr>td:not(.hp-optionsMenu)").on("click", function(e) {
    e.preventDefault();
    $(this).parent().trigger('contextmenu');
    return false;
});

$(".hp-optionsTable>tr>td>a").on("click", function(e) {
    // links in tables
    e.stopPropagation();
});

$(".hp-optionsTable>tr>td>input").on("click", function(e) {
    // checkbox in media list
    e.stopPropagation();
});

/*
 * EDIT POSTS AND COMMENTS
 */

// remove markdown-editor from post
$('body').on('click', 'button.hp-post-edit-abort', function(e) {
    // get post id to find target container with content to edit
    $(this).closest('.formContainer').remove();
    $('#'+$(this).data('abortPostId')).show();
});

// edit post or comment
$('body').on('click', 'a.hp-post-edit', function(e) {
    var clickedLink = $(this);

    // out of time frame?
    if(clickedLink.hasClass("disabled"))
        return false;
    else {
        // get post id to find target container with content to edit
        var targetPostId = clickedLink.data('targetPostId');
        var postContainer = $("#"+targetPostId);

        // hide content of postContainer
        postContainer.hide();
        // create formContainer which will load markdown editor
        postContainer.before('<div class="formContainer"></div>');

        // load markdown editor
        var formContainer = postContainer.prev();
        formContainer.load("/post/"+targetPostId+"/getEditForm", function(response, status, xhr) {
            if (status == "error") {
                console.log("Error when trying to edit post: ["+status+"]");
                showErrorBeforeElement(postContainer, '<strong>Ein Fehler ist aufgetreten!</strong> <a class="hp-reload" href="#">Bitte laden Sie die Seite neu!</a>');
                $(".hp-reload").click(function() {
                    window.location.reload();
                });
                formContainer.remove();
            } else {
                formContainer.find('textarea').markdown({
                    savable: true,
                    language: 'de',
                    autofocus: true,
                    onShow: function(e) {
                        var saveButton = e.$editor.find('.md-footer').find('button');
                        saveButton.after('<button type="button" class="btn btn-sm btn-default hp-post-edit-abort" data-abort-post-id='+targetPostId+'><span>Abbrechen</span></button');
                        saveButton.html('<span class="glyphicon glyphicon-refresh"></span> Aktualisieren');
                    },
                    onPreview: function(e) {
                        return md.render(e.getContent());
                    },
                    onSave: function(e) {
                        var form = formContainer.find("form");
                        $.ajax({
                            url: form.attr('action'),
                            type: "POST",
                            data: form.serialize(),
                            success: function (data) {
                                // replace returned data and show it
                                postContainer.html(data);
                                postContainer.show();
                                // remove 'marked' to apply markdown after loading ($.ajaxSetup.complete)
                                postContainer.removeClass('marked');
                                formContainer.remove();
                            },
                            error: function(xhr, status, errorThrown) {
                                console.log("Error when submitting edited post: ["+status+"] " + errorThrown);
                                showErrorBeforeElement(postContainer, '<strong>Ein Fehler ist aufgetreten!</strong> <a class="hp-reload" href="#">Bitte laden Sie die Seite neu!</a> (Vielleicht ist der Bearbeitungszeitraum zuende?)');
                                $(".hp-reload").click(function() {
                                    window.location.reload();
                                });
                            }
                        });
                    },
                    dropZoneOptions: {
                        url: "/media/upload/"+formContainer.find('textarea').data('uploadfolderId'),
                        clickable: '.hp-dropzone-edit-clickable',
                        previewsContainer: '.hp-dropzone-edit-preview'
                    }
                });
            }
        });
        return false;
    }
});

/*
 *  prevent click action for disabled list items
 */
$("li > a").click(function(e) {
	if ($(this).parent().hasClass('disabled')) {
		e.preventDefault();
		return false;
	}
});

/*
 *  prevent easy copying of account deletion confirmation text
 */
$(document).on("copy", function(e) {
    if ($("#hp-deleteModal").is(":visible")) { // if the deletion confirmation is actually visible
        var selection = window.getSelection();
        if (selection.toString().contains("ösche ich meinen Account von dieser wundervolle")) { // check if the user copied the 'forbidden' string (or at least the middle part of it)
            var newdiv = document.createElement('div');

            //hide the newly created container
            newdiv.style.position = 'absolute';
            newdiv.style.left = '-9999px';

            //insert the container, fill it with the extended text, and define the new selection
            document.body.appendChild(newdiv);
            newdiv.innerHTML = "It's not that easy!";
            selection.selectAllChildren(newdiv);

            window.setTimeout(function () {
                document.body.removeChild(newdiv);
            }, 100);
        }
    }
});

/*
 *  show "create folder" form (group media) and focus input field
 */
$('body').on('click', 'a.hp-create-folder', function(e) {
    e.preventDefault();
    $("#hp-create-folder-wrapper").removeClass('hidden');
    $("#hp-create-folder-wrapper").find('input').focus();
});

/*
 * submit media and folder deletion form
 */
$('body').on('click', '.hp-mediaList-submit', function (e) {
    $('#mediaListFrom').append('<input type="hidden" name="action" value="delete">').submit();
});

/*
 * Markdown definition
 */
var md = window.markdownit({
            html: false,
            breaks: true,
            linkify: false,
            typographer: true
        }).use(window.markdownitMark).use(window.markdownitEmoji);

md.renderer.rules.emoji = function(token, idx) {
  return '<img class="emoji" width="20" height="20" src="' + location.origin + '/assets/images/emojis/' + token[idx].markup + '.png" />';
};

// apply markdown editor
$("#hp-new-post-content").markdown({
    savable: true,
    language: 'de',
    onPreview: function(e) {
        return md.render(e.getContent());
    },
    onSave: function(e) {
        // prevent submitting empty posts
        if (e.getContent().length > 0) {
            $('#hp-post-submit-button').click();
        } else {
            e.$textarea.animate({opacity:0.1},200,"linear",function() { // blink and focus textarea
                $(this).animate({opacity:1},200);
                $(this).focus();
            }).focus();
        }
    },
    dropZoneOptions: {
        url: "/media/upload/"+$("#hp-new-post-content").data('uploadfolderId'),
        clickable: '.hp-dropzone-clickable',
        previewsContainer: '.hp-dropzone-preview',
        parallelUploads: 1
    }
});

// remove markdown-editor from post
$('body').on('click', 'button.hp-post-abort', function(e) {
    var editor = $(this).parent().parent();
    var textarea = editor.find('textarea');
    textarea.removeClass('md-input dropzone');
    textarea.removeData('markdown');
    editor.parent().append(textarea);
    editor.remove();
});

$('body').on('click', '.hp-new-comment-content', function(e) {
    e.preventDefault();
    $(this).markdown({
        savable: true,
        autofocus: true,
        language: 'de',
        onShow: function(e) {
           // resize editor header
           $.each(e.$editor.find('.btn-group'), function( index, value ) {
                $(value).addClass('btn-group-xs');
           });
           e.$editor.find('.md-control.md-control-fullscreen').css('padding', '0px');

           // create abort button beside saveButton
           var saveButton = e.$editor.find('.md-footer').find('button');
           saveButton.addClass('btn-xs');
           saveButton.after('<button type="button" class="btn btn-xs btn-default hp-post-abort"><span>Abbrechen</span></button');
           saveButton.html('<span class="glyphicon glyphicon-send"></span> Senden');
        },
        onPreview: function(e) {
           return md.render(e.getContent());
        },
        onSave: function(e) {
            var context = e.$editor.parent();
            var target = e.$editor.parent().parent().parent();
            var textarea = e.$textarea;
            // prevent submitting empty posts
            if (e.getContent().length > 0) {
                $.ajax({
                    url: context.attr('action'),
                    type: "POST",
                    data: context.serialize(),
                    success: function (data) {
                        target.before(data);
                        context[0].reset();
                    }, error: function () {

                    }
                });
            } else {
                textarea.animate({opacity: 0.1}, 200, "linear", function () {
                       $(this).animate({opacity: 1}, 200);
                       $(this).focus();
                   });
            }
        },
        dropZoneOptions: {
            url: "/media/upload/"+$(this).data('uploadfolderId'),
            clickable: '.hp-dropzone-comment-clickable',
            previewsContainer: '.hp-dropzone-comment-preview',
            parallelUploads: 1
        }
    });
});

$(document).ready(function () {

    markdownPostContent();

    /*
     *  Token
     */
	var preSelection = $("input:radio[name=type]:checked").val();
	if(preSelection == 2) {
		$("#token-input").show();
	}
	$("input:radio[name=type]").click(function() {
		var selection = $(this).val();
		if(selection == 2) {
			$("#token-input").fadeIn();
		} else {
			$("#token-input").fadeOut();
		}

	});

	/*
	 * AJAX loading indicator
	 */
	$.ajaxSetup({
		beforeSend:function(){
			$(".loading").show();
			$(".loading").css('display', 'inline-block');
		},
		complete:function(){
			$(".loading").hide();
			markdownPostContent();
			autolinkUrls();
			linkOlderComments();
		}
	});

    /*
     * Auto-pagination with jQuery plugin (modified version of jquery.auto.pagination.js)
     */
    if($('a.nextPage').length > 0) { // only apply on pages with a nextPage link
        $('.hp-pagination-container').AutoPagination({
            nextPageSelector: 'a.nextPage',
            panelSelector: '.hp-pagination-element',
            loaderDivClass: 'ajax-loader',
            loaderDivStyle: 'text-align:center;margin-top:20px;font-weight:bold;',
            loaderImage: '/assets/images/loading.gif',
            loaderText: 'Lade nächste Seite...'
        });
    }

    /*
     * Show 'Back to top'-link (src: http://jsfiddle.net/panman8201/mkzrm/10/)
     */
    if (($(window).height() + 200) < $(document).height() ) {
        $('#hp-top-link').removeClass('hidden').affix({
            // how far to scroll down before link "slides" into view
            offset: { top:200 }
        });
        $('#hp-top-link a').click(function(event) {
            $('html,body').animate({scrollTop:0});
            return false;
        });
    }

	linkOlderComments();

    autolinkUrls();

    /*
     * Add Countdown to Account deletion button
     */
    $("#hp-deleteModal").on("show.bs.modal", function() {
        $("#hp-deleteConfirmSubmit").attr("disabled", "disabled");

        if($.disableDeleteFunctionTimeout) {
            clearTimeout($.disableDeleteFunctionTimeout);
        }

        var disableTimeLeft = 10;
        var disableCountdown = function() {
            if(disableTimeLeft > 0) {
                $("#hp-deleteConfirmSubmit").val("Warte "+disableTimeLeft+"s...");
                disableTimeLeft--;
                $.disableDeleteFunctionTimeout = setTimeout(disableCountdown, 1000);
            } else {
                $("#hp-deleteConfirmSubmit").removeAttr("disabled");
                $("#hp-deleteConfirmSubmit").val("LÖSCHEN");
            }
        };
        disableCountdown();
    });

    /*
     * SEARCH: AutoSuggestion
     */
    var autoSuggestResult = new Bloodhound({
        datumTokenizer: Bloodhound.tokenizers.obj.whitespace('value'),
        queryTokenizer: Bloodhound.tokenizers.whitespace,
        limit: 10,
        remote: {
            url: '/suggestions?query=',
            rateLimitWait: 0,
            replace: function(url, uriEncodedQuery) {
                return url + uriEncodedQuery.toLowerCase();
            },
            filter: function(parsedResponse) {
                var result = [];
                $.map(parsedResponse.hits.hits, function(item) {
                    var label = '';
                    var hLabel = '';
                    var groupType = '';
                    var icon = '';
                    var custom_avatar = false;
                    if(item._type === 'user') {
                        label = item._source.name;
                        hLabel = item.highlight.name[0].replace(/\[startStrong\]/g, '<strong>').replace(/\[endStrong\]/g, '</strong>');
                        if(item._source.avatar === 'custom') {custom_avatar = true;}
                    }
                    if(item._type === 'group') {
                        label = item._source.title;
                        hLabel = item.highlight.title[0].replace(/\[startStrong\]/g, '<strong>').replace(/\[endStrong\]/g, '</strong>');
                        groupType = item._source.grouptype;
                        if(item._source.avatar) {
                            custom_avatar = true;
                        } else {
                            if(groupType === 'open') icon = 'globe';
                            if(groupType === 'close') icon = 'lock';
                            if(groupType === 'course') icon = 'briefcase';
                        }
                    }
                    if(item._type === 'medium') {
                        label = item._source.filename;
                        hLabel = item.highlight.filename[0].replace(/\[startStrong\]/g, '<strong>').replace(/\[endStrong\]/g, '</strong>');
                        groupType = item._source.grouptype;
                        icon = 'file';
                    }
                    result.push({
                        label: label,
                        hLabel: hLabel,
                        initial: item._source.initial,
                        custom_avatar: custom_avatar,
                        id: item._id,
                        type: item._type,
                        avatar: item._source.avatar,
                        groupType: groupType,
                        icon: icon
                    });
                });
                return result;
            }
        }
    });

    autoSuggestResult.initialize();

    $('.hp-search-form .form-control').typeahead(
        {
            hint: true,
            highlight: false,
            minLength: 2
        },
        {
            name: 'accounts-and-groups',
            displayKey: 'label',
            source: autoSuggestResult.ttAdapter(),

            templates: {
                empty: [
                    '<div class="autosuggest-empty-message">',
                    'Kein Gruppe oder Person gefunden.',
                    '</div>'
                ].join('\n'),
                suggestion: Handlebars.compile("" +
                    "{{#if custom_avatar}} " +
                    "<img class='autosuggest-custom-avatar hp-avatar-small' src='/{{type}}/{{id}}/avatar' alt='avatar'>{{{hLabel}}}" +
                    "{{else}}" +
                    "{{#if avatar}}" +
                    "<div class='autosuggest-avatar hp-avatar-small hp-avatar-default-{{avatar}}'>{{initial}}</div>" +
                    "<div class='autosuggest-username'>{{{hLabel}}}</div>" +
                    "{{/if}}" +
                    "{{/if}}" +
                    "{{#if icon}}" +
                    "<span class='glyphicon glyphicon-{{icon}} autosuggest-group-icon'></span>{{{hLabel}}}" +
                    "{{/if}}")
            }
        }
    ).on('typeahead:selected', function($e, searchResult){
        if (searchResult.type === 'medium') {
            window.open(window.location.origin + "/media/" + searchResult.id);
        } else {
            window.location.href = window.location.origin + "/"+searchResult.type+"/" + searchResult.id + '/stream';
        }
    });
});

$(window).resize(function() {
	truncateBreadcrumb();
});

$('body').tooltip({
    selector: '[rel=tooltip]'
});
$('body').popover({
    trigger: 'hover',
    selector: '[rel="popover"]'
});

/*
 * SET OR REMOVE BOOKMARKS
 */
$('.hp-pagination-container').on('click', 'a.hp-post-bookmark-icon', function() {
    var id = $(this).attr('href').split('-')[1];
    var context = this;
    var icon = this.children[0];
    $.ajax({
     url: "/post/"+id + "/bookmark",
     type: "PUT",
     success: function(data){
         if(data === "setBookmark") {
             $(icon).addClass('glyphicon-floppy-saved');
             $(icon).removeClass('glyphicon-floppy-disk');
             $(context).attr("data-original-title", "Post vergessen").tooltip('fixTitle').tooltip('show');
         }
         if(data === "removeBookmark") {
             $(icon).addClass('glyphicon-floppy-disk');
             $(icon).removeClass('glyphicon-floppy-saved');
             $(context).attr("data-original-title", "Post merken").tooltip('fixTitle').tooltip('show');
         }
     }
    });
});

truncateBreadcrumb();

/*
 * EXPAND PROFILE/GROUP TEXT
 */
$('#hp-profile-header .bottomline .text').readmore({
    collapsedHeight: 47,
    moreLink: '<a href="#">... mehr</a>',
    lessLink: '<a href="#">schließen</a>'
});

$('#hp-profile-header .bottomline .hp-avatar-wrapper').readmore({
    collapsedHeight: 43,
    moreLink: '<a href="#">... weitere</a>',
    lessLink: '<a href="#">schließen</a>'
});

/*
 * ENABLE DROPZONE FOR GROUP UPLOAD
 */
$("form#groupUploadDropzone").dropzone({
    init: function() {
        this.on("queuecomplete", function() {
            var folder = $("form#groupUploadDropzone").data("folder");
            console.log(this);
            $.ajax({
                url: "/media/list/" + folder,
                type: "GET",
                success: function(data){
                    $mediaList = $("#hp-group-media-list");
                    $mediaList.html(data);
                }
            });

        });
    },
    parallelUploads: 1,
    dictDefaultMessage: '<span class="glyphicon glyphicon-upload"></span> Datei(en) durch Klick oder Drag&Drop auswählen',
});