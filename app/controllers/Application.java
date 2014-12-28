package controllers;

import models.Account;
import models.Group;
import models.Post;
import models.enums.GroupType;
import models.services.ElasticsearchService;
import org.elasticsearch.index.query.QueryBuilder;
import org.elasticsearch.index.query.QueryBuilders;
import org.elasticsearch.search.SearchHit;
import play.Logger;
import play.Play;
import play.Routes;
import play.data.DynamicForm;
import play.data.Form;
import play.db.jpa.Transactional;
import play.mvc.Result;
import play.mvc.Security;
import views.html.error;
import views.html.help;
import views.html.stream;
import views.html.feedback;
import controllers.Navigation.Level;
import org.elasticsearch.action.search.SearchResponse;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ExecutionException;

import static play.data.Form.form;


@Transactional
public class Application extends BaseController {
	
	static Form<Post> postForm = Form.form(Post.class);
	static final int LIMIT = Integer.parseInt(Play.application().configuration().getString("htwplus.post.limit"));
	static final int PAGE = 1;
	
	public static Result javascriptRoutes() {
		response().setContentType("text/javascript");

		return ok(
                Routes.javascriptRouter("jsRoutes",
				    controllers.routes.javascript.GroupController.create(),
				    controllers.routes.javascript.GroupController.update()
				)
        );
	}

	@Security.Authenticated(Secured.class)
	public static Result index() {
		Navigation.set(Level.STREAM);
		Account currentAccount = Component.currentAccount();
		return ok(stream.render(currentAccount,Post.getStream(currentAccount, LIMIT, PAGE),postForm,Post.countStream(currentAccount), LIMIT, PAGE));
	}
	
	public static Result help() {
		Navigation.set(Level.HELP);
		return ok(help.render());
	}
	
	@Security.Authenticated(Secured.class)
	public static Result stream(int page) {
		Navigation.set(Level.STREAM);
		Account currentAccount = Component.currentAccount();
		return ok(stream.render(currentAccount,Post.getStream(currentAccount, LIMIT, page),postForm,Post.countStream(currentAccount), LIMIT, page));
	}
	
	@Security.Authenticated(Secured.class)
	public static Result search() throws ExecutionException, InterruptedException {
        String keyword = form().bindFromRequest().field("keyword").value();
        Logger.info("searching for: "+keyword);

        List<Account> accountList = new ArrayList<>();
        List<Group> groupList = new ArrayList<>();
        List<Group> courseList = new ArrayList<>();
        List<Post> postList =new ArrayList<>();

        /**
         * Build ES Query.
         * Search for keyword on each field: account.name, post.content, group.title
         */
        QueryBuilder qb = QueryBuilders.multiMatchQuery(keyword,"name","content","title");

        /**
         * Execute search with given query
         */
        SearchResponse response = ElasticsearchService.getInstance().getClient().prepareSearch("htwplus")
                .setQuery(qb)
                .execute()
                .get();

        /**
         * Iterate over response and add each searchHit to one list.
         * Pay attention to view rights for post.content.
         */
        for (SearchHit searchHit : response.getHits().getHits()) {
            switch (searchHit.type()) {
                case "user":
                    accountList.add(Account.findById(Long.parseLong(searchHit.getId())));
                    break;
                case "post":
                    Post post = Post.findById(Long.parseLong(searchHit.getId()));
                    if (Secured.viewPost(post))
                        postList.add(post);
                    break;
                case "group":
                    Group group = Group.findById(Long.parseLong(searchHit.getId()));
                    switch (group.groupType) {
                        case course:
                            courseList.add(Group.findById(Long.parseLong(searchHit.getId())));
                            break;
                        case open:
                            groupList.add(Group.findById(Long.parseLong(searchHit.getId())));
                            break;
                        case close:
                            groupList.add(Group.findById(Long.parseLong(searchHit.getId())));
                            break;
                    }
                    break;
                default: Logger.info("no matching case for ID: "+searchHit.getId());
            }
        }

        return ok(views.html.searchresult.render(keyword, accountList, groupList, courseList, postList, postForm));
	}

	public static Result error() {
		Navigation.set("404");
		return ok(error.render());
	}
	
	public static Result feedback() {
		Navigation.set("Feedback");
		return ok(feedback.render(postForm));
		
	}
	
	public static Result addFeedback() {
		
		Account account = Component.currentAccount();
		Group group = Group.findByTitle("HTWplus Feedback");
		
		// Guest case
		if(account == null) {
			account = Account.findByEmail("admin@htwplus.de");
		}
		
		Form<Post> filledForm = postForm.bindFromRequest();
		if (filledForm.hasErrors()) {
			flash("error", "Jo, fast. Probiere es noch einmal mit Inhalt ;-)");
			return redirect(controllers.routes.Application.feedback());
		} else {
			Post p = filledForm.get();
			p.owner = account;
			p.group = group;
			p.create();
			flash("success","Vielen Dank für Dein Feedback!");
		}

		return redirect(controllers.routes.Application.index());
	}
	
		
		
	public static Result defaultRoute(String path) {
		Logger.info(path+" nicht gefunden");
		return redirect(controllers.routes.Application.index());
	}

}
