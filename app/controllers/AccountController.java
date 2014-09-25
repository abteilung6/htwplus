package controllers;

import static play.data.Form.form;

import java.util.Random;

import models.Account;
import models.LDAPConnector;
import models.enums.AccountRole;
import models.Login;
import play.Logger;
import play.data.DynamicForm;
import play.data.Form;
import play.db.jpa.Transactional;
import play.i18n.Messages;
import play.mvc.Result;
import views.html.index;

/**
 * Controller for authenticate purposes.
 */
@Transactional
public class AccountController extends BaseController {
	/**
	 * Defines a form wrapping the Account class.
	 */
	final static Form<Account> signupForm = form(Account.class);

    /**
     * Default authentication action.
     *
     * @return Result
     */
	public static Result authenticate() {
		DynamicForm form = form().bindFromRequest();
		String username = form.field("email").value();
	
		if (username.contains("@")) {
			return defaultAuthenticate();
		} else if (username.length() == 0) {
			flash("error", Messages.get("authenticate.matriculationNumberMissing"));
			return badRequest(index.render());
		} else {
			return LDAPAuthenticate();
		}
	}

    /**
     * LDAP authentication.
     *
     * @return Result
     */
	private static Result LDAPAuthenticate() {
		Form<Login> form = form(Login.class).bindFromRequest();
		String matriculationNumber = form.field("email").value();
		String password = form.field("password").value();
		String rememberMe = form.field("rememberMe").value();
		
		// Clean the username
		matriculationNumber = matriculationNumber.trim().toLowerCase();

        // establish LDAP connection and try to get user data
		LDAPConnector ldap = new LDAPConnector();
		try {
			ldap.connect(matriculationNumber, password);
		} catch (LDAPConnector.LdapConnectorException e) {
			flash("error", e.getMessage());
			Component.addToContext(Component.ContextIdent.loginForm, form);
			return badRequest(index.render());
		}

        // try to find user in DB, set role if found (default STUDENT role)
		Account account = Account.findByLoginName(matriculationNumber);
		AccountRole role = AccountRole.STUDENT;
		if (ldap.getRole() != null) {
			role = ldap.getRole();
		}

        // if user is not found in DB, create new user from LDAP data, otherwise update user data
		if (account == null) {
			account = new Account();
			Logger.info("New Account for " + matriculationNumber + " will be created.");
			account.firstname = ldap.getFirstName();
			account.lastname = ldap.getLastName();
			account.loginname = matriculationNumber;
            account.email = ldap.getEmail();
			account.password = "LDAP - not needed";
			Random generator = new Random();
			account.avatar = "a" + generator.nextInt(10);
			account.role = role;
			account.create();
		} else {
			account.firstname = ldap.getFirstName();
			account.lastname = ldap.getLastName();
            account.email = ldap.getEmail();
			account.role = role;
			account.update();
		}

        // re-create session, set user
		session().clear();
		session("id", account.id.toString());
		if (rememberMe != null) {
			session("rememberMe", "1");
		}

		return redirect(controllers.routes.Application.index());
	}

	private static Result defaultAuthenticate() {
		Form<Login> loginForm = form(Login.class).bindFromRequest();
		if (loginForm.hasErrors()) {
			flash("error", loginForm.globalError().message());
			Component.addToContext(Component.ContextIdent.loginForm, loginForm);
			return badRequest(index.render());
		} else {
			session().clear();
			session("email", loginForm.get().email);
			session("id", Account.findByEmail(loginForm.get().email).id.toString());
			session("firstname", Account.findByEmail(loginForm.get().email).firstname);
			if (loginForm.get().rememberMe != null) {
				session("rememberMe", "1");
			}
			
			return redirect(controllers.routes.Application.index());
		}
	}

	/**
	 * Logout and clean the session.
	 */
	public static Result logout() {
		session().clear();
		flash("success", Messages.get("authenticate.logout"));

		return redirect(controllers.routes.Application.index());
	}
}
